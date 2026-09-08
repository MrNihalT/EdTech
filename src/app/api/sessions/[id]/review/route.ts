import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateJSONResponse } from "@/lib/ai/gemini";
import { buildSessionReviewPrompt } from "@/lib/ai/prompts";

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

    // STRICT Lifecycle check: status MUST be 'completed' (or 'ai_reviewed' if regenerating)
    if (session.status !== "completed" && session.status !== "ai_reviewed") {
      return NextResponse.json(
        {
          error: `Invalid transition: Session must be 'completed' before generating AI review. Current status: '${session.status}'.`,
        },
        { status: 400 }
      );
    }

    const studentInfo = {
      name: session.students.name,
      subject: session.students.subject,
      current_level: session.students.current_level,
      learning_goals: session.students.learning_goals,
      weak_areas: session.students.weak_areas,
    };

    const prompt = buildSessionReviewPrompt(
      studentInfo,
      session.topic,
      session.notes || ""
    );

    const aiResult = await generateJSONResponse<{
      summary: string;
      homework: string[];
      next_topic?: string;
    }>(prompt);

    // Upsert into ai_session_reviews table
    const { data: reviewRecord, error: reviewError } = await supabase
      .from("ai_session_reviews")
      .upsert(
        {
          session_id: sessionId,
          summary: aiResult.summary || "No summary generated.",
          homework: aiResult.homework || [],
          next_topic: aiResult.next_topic || null,
        },
        { onConflict: "session_id" }
      )
      .select()
      .single();

    if (reviewError) {
      return NextResponse.json(
        { error: `Failed to save AI session review: ${reviewError.message}` },
        { status: 400 }
      );
    }

    // Transition status to 'ai_reviewed'
    await supabase
      .from("sessions")
      .update({
        status: "ai_reviewed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    return NextResponse.json({ review: reviewRecord });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate AI session review";
    console.error("AI Session Review Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
