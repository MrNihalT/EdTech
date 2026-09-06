import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    const { data: session, error: fetchError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (fetchError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.tutor_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: You are not the tutor for this session" },
        { status: 403 }
      );
    }

    // STRICT Lifecycle check: MUST be 'in_progress'
    if (session.status !== "in_progress") {
      return NextResponse.json(
        {
          error: `Invalid transition: Cannot complete session with status '${session.status}'. Expected 'in_progress'.`,
        },
        { status: 400 }
      );
    }

    const { data: updatedSession, error: updateError } = await supabase
      .from("sessions")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to complete session: ${updateError.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ session: updatedSession });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
