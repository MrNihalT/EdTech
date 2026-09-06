import React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default async function StudentDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .single();

  // Find student record
  const { data: studentRecord } = await supabase
    .from("students")
    .select("*")
    .eq("user_id", user!.id)
    .single();

  if (!studentRecord) {
    return (
      <Card className="p-8 text-center text-slate-500">
        Student record not found. Please ask your tutor to set up your profile.
      </Card>
    );
  }

  // Fetch Next Session
  const { data: nextSessions } = await supabase
    .from("sessions")
    .select("*")
    .eq("student_id", studentRecord.id)
    .in("status", ["scheduled", "in_progress"])
    .order("scheduled_at", { ascending: true })
    .limit(1);

  const nextSession = nextSessions && nextSessions.length > 0 ? nextSessions[0] : null;

  // Fetch Past Sessions
  const { data: pastSessions } = await supabase
    .from("sessions")
    .select("*, ai_session_reviews(summary, homework)")
    .eq("student_id", studentRecord.id)
    .in("status", ["completed", "ai_reviewed"])
    .order("scheduled_at", { ascending: false })
    .limit(5);

  // Collect homework items from past sessions
  const homeworkItems: { task: string; sessionTopic: string }[] = [];
  if (pastSessions) {
    for (const sess of pastSessions) {
      const rev = Array.isArray(sess.ai_session_reviews)
        ? sess.ai_session_reviews[0]
        : sess.ai_session_reviews;
      if (rev && Array.isArray(rev.homework)) {
        rev.homework.forEach((hw: string) => {
          homeworkItems.push({ task: hw, sessionTopic: sess.topic });
        });
      }
    }
  }

  return (
    <div className="space-y-8">
      {/* Top Welcome Banner */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome, {profile?.full_name?.split(" ")[0] || "Student"} 👋
        </h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">
          Here&apos;s your learning progress in <span className="text-blue-600 font-semibold">{studentRecord.subject}</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content (2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Next Session Card */}
          <Card className="p-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Next Session
            </h2>
            {!nextSession ? (
              <p className="text-sm text-slate-500 font-medium">No upcoming session scheduled right now.</p>
            ) : (
              <div className="flex items-center justify-between p-4 bg-blue-50/60 rounded-xl border border-blue-100">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{nextSession.topic}</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {new Date(nextSession.scheduled_at).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      at{" "}
                      {new Date(nextSession.scheduled_at).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <StatusBadge status={nextSession.status} />
              </div>
            )}
          </Card>

          {/* Past Sessions List */}
          <Card className="p-0 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Past Sessions</h2>
              <Link href="/student/sessions" className="text-xs font-semibold text-blue-600 hover:underline">
                View all
              </Link>
            </div>

            {!pastSessions || pastSessions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">No completed sessions yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pastSessions.map((s) => (
                  <Link
                    key={s.id}
                    href={`/student/sessions/${s.id}`}
                    className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{s.topic}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(s.scheduled_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <StatusBadge status={s.status} />
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Sidebar: Homework Checklist */}
        <div>
          <Card className="p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900">Homework</h2>
              <Link href="/student/homework" className="text-xs font-semibold text-blue-600 hover:underline">
                See all
              </Link>
            </div>

            {homeworkItems.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6 font-medium">
                No homework tasks assigned yet.
              </p>
            ) : (
              <div className="space-y-3">
                {homeworkItems.slice(0, 5).map((hw, idx) => (
                  <label key={idx} className="flex items-start gap-3 text-xs text-slate-700 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                    <input type="checkbox" className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    <span>{hw.task}</span>
                  </label>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
