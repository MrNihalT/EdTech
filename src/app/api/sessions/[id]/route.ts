import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
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

    // Get existing session
    const { data: session, error: fetchError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (fetchError || !session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    if (session.tutor_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: You are not the tutor for this session" },
        { status: 403 }
      );
    }

    // Lifecycle check for editing notes: Notes can ONLY be edited when status is 'in_progress'
    if (session.status === "completed" || session.status === "ai_reviewed") {
      return NextResponse.json(
        { error: "Session notes are locked once session is completed." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { notes } = body;

    const { data: updatedSession, error: updateError } = await supabase
      .from("sessions")
      .update({
        notes: notes ?? session.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update session: ${updateError.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ session: updatedSession });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
