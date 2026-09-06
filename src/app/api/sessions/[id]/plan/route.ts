import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateJSONResponse } from "@/lib/ai/gemini";
import { buildSessionPlanPrompt } from "@/lib/ai/prompts";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch session with student details
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*, students(*)")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session || !session.students) {
      return NextResponse.json(
        { error: "Session or student data not found" },
        { status: 404 }
      );
    }

    if (session.tutor_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: You are not the tutor for this session" },
        { status: 403 }
      );
    }

    // Fetch past sessions history for this student
    const { data: pastSessions } = await supabase
      .from("sessions")
      .select("topic, scheduled_at, notes")
      .eq("student_id", session.student_id)
      .neq("id", sessionId)
      .order("scheduled_at", { ascending: false })
      .limit(5);

    const studentInfo = {
      name: session.students.name,
      subject: session.students.subject,
      current_level: session.students.current_level,
      learning_goals: session.students.learning_goals,
      weak_areas: session.students.weak_areas,
    };

    const prompt = buildSessionPlanPrompt(
      studentInfo,
      pastSessions || [],
      session.topic
    );

    const aiResult = await generateJSONResponse<{
      objectives: string[];
      lesson_outline: string[];
      practice_questions: string[];
    }>(prompt);

    // Upsert into ai_session_plans table
    const { data: planRecord, error: planError } = await supabase
      .from("ai_session_plans")
      .upsert(
        {
          session_id: sessionId,
          objectives: aiResult.objectives || [],
          lesson_outline: aiResult.lesson_outline || [],
          practice_questions: aiResult.practice_questions || [],
        },
        { onConflict: "session_id" }
      )
      .select()
      .single();

    if (planError) {
      return NextResponse.json(
        { error: `Failed to save AI session plan: ${planError.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ plan: planRecord });
  } catch (err: any) {
    console.error("AI Session Plan Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate AI lesson plan" },
      { status: 500 }
    );
  }
}
