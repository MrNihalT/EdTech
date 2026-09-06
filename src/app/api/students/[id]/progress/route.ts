import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateJSONResponse } from "@/lib/ai/gemini";
import { buildProgressSummaryPrompt, ReviewInfo } from "@/lib/ai/prompts";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("*")
      .eq("id", studentId)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (student.tutor_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: You are not the tutor for this student" },
        { status: 403 }
      );
    }

    // Fetch all sessions and AI reviews for this student
    const { data: sessions } = await supabase
      .from("sessions")
      .select("id, topic, scheduled_at, ai_session_reviews(summary, homework, next_topic)")
      .eq("student_id", studentId)
      .order("scheduled_at", { ascending: true });

    const reviews: ReviewInfo[] = [];

    if (sessions) {
      for (const s of sessions) {
        // ai_session_reviews can be single object or array depending on query result shape
        const rev = Array.isArray(s.ai_session_reviews)
          ? s.ai_session_reviews[0]
          : s.ai_session_reviews;

        if (rev) {
          reviews.push({
            topic: s.topic,
            summary: rev.summary,
            homework: rev.homework || [],
            next_topic: rev.next_topic,
          });
        }
      }
    }

    const studentInfo = {
      name: student.name,
      subject: student.subject,
      current_level: student.current_level,
      learning_goals: student.learning_goals,
      weak_areas: student.weak_areas,
    };

    const prompt = buildProgressSummaryPrompt(studentInfo, reviews);

    const aiResult = await generateJSONResponse<{ summary: string }>(prompt);

    return NextResponse.json({ summary: aiResult.summary });
  } catch (err: any) {
    console.error("AI Progress Summary Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate progress summary" },
      { status: 500 }
    );
  }
}
