import React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { redirect } from "next/navigation";

export default async function StudentSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: studentRecord } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user!.id)
    .single();

  if (!studentRecord) {
    redirect("/student");
  }

  // Fetch session & verify ownership
  const { data: session } = await supabase
    .from("sessions")
    .select("*, ai_session_reviews(*)")
    .eq("id", sessionId)
    .eq("student_id", studentRecord.id)
    .single();

  if (!session) {
    return <Card className="p-8 text-center text-slate-500">Session not found or access restricted.</Card>;
  }

  const review = Array.isArray(session.ai_session_reviews)
    ? session.ai_session_reviews[0]
    : session.ai_session_reviews;

  const dateObj = new Date(session.scheduled_at);
  const dateStr = dateObj.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = dateObj.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6">
      <Link
        href="/student/sessions"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Sessions
      </Link>

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{session.topic}</h1>
              <StatusBadge status={session.status} />
            </div>
            <p className="text-sm font-medium text-slate-500 mt-1">
              {dateStr} at {timeStr}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tutor Notes Read-Only */}
        <Card className="p-6">
          <h2 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 mb-4">
            Session Notes
          </h2>
          {!session.notes ? (
            <p className="text-xs text-slate-400 font-medium">No notes provided for this session.</p>
          ) : (
            <div className="text-sm text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
              {session.notes}
            </div>
          )}
        </Card>

        {/* AI Session Review / Homework */}
        <Card className="p-6 bg-purple-50/40 border-purple-200">
          <h2 className="text-base font-bold text-purple-900 pb-3 border-b border-purple-100 mb-4">
            AI Session Summary & Homework
          </h2>
          {!review ? (
            <p className="text-xs text-slate-400 font-medium">
              AI review has not been generated for this session yet.
            </p>
          ) : (
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-1">
                  Summary
                </h4>
                <p className="text-slate-800 font-medium leading-relaxed">{review.summary}</p>
              </div>

              {Array.isArray(review.homework) && review.homework.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-1">
                    Homework Assigned
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-800 font-medium">
                    {review.homework.map((hw: string, i: number) => (
                      <li key={i}>{hw}</li>
                    ))}
                  </ul>
                </div>
              )}

              {review.next_topic && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-1">
                    Next Topic Preview
                  </h4>
                  <p className="text-slate-800 font-medium">{review.next_topic}</p>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
