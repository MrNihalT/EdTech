import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "tutor") {
      return NextResponse.json(
        { error: "Forbidden: Only tutors can schedule sessions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { student_id, scheduled_at, topic } = body;

    if (!student_id || !scheduled_at || !topic) {
      return NextResponse.json(
        { error: "Missing student_id, scheduled_at, or topic" },
        { status: 400 }
      );
    }

    // Double booking check: Ensure tutor doesn't already have a session scheduled at the exact same scheduled_at
    const { data: existingSessions, error: checkError } = await supabase
      .from("sessions")
      .select("id")
      .eq("tutor_id", user.id)
      .eq("scheduled_at", scheduled_at);

    if (checkError) {
      return NextResponse.json(
        { error: `Database error checking session conflict: ${checkError.message}` },
        { status: 500 }
      );
    }

    if (existingSessions && existingSessions.length > 0) {
      return NextResponse.json(
        {
          error:
            "Double-booking conflict: You already have a session scheduled at this date and time.",
        },
        { status: 400 }
      );
    }

    // Insert new session
    const { data: newSession, error: insertError } = await supabase
      .from("sessions")
      .insert({
        tutor_id: user.id,
        student_id,
        scheduled_at,
        topic,
        status: "scheduled",
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to create session: ${insertError.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ session: newSession }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
