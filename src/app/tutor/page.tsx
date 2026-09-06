import React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default async function TutorDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .single();

  // 1. Fetch total students count
  const { count: studentCount } = await supabase
    .from("students")
    .select("*", { count: "exact", head: true })
    .eq("tutor_id", user!.id);

  // 2. Fetch upcoming sessions count (scheduled or in_progress)
  const { count: upcomingCount } = await supabase
    .from("sessions")
    .select("*", { count: "exact", head: true })
    .eq("tutor_id", user!.id)
    .in("status", ["scheduled", "in_progress"]);

  // 3. Fetch completed sessions count (completed or ai_reviewed)
  const { count: completedCount } = await supabase
    .from("sessions")
    .select("*", { count: "exact", head: true })
    .eq("tutor_id", user!.id)
    .in("status", ["completed", "ai_reviewed"]);

  // 4. Fetch upcoming sessions list with student info
  const { data: upcomingSessions } = await supabase
    .from("sessions")
    .select("*, students(name, subject)")
    .eq("tutor_id", user!.id)
    .in("status", ["scheduled", "in_progress"])
    .order("scheduled_at", { ascending: true })
    .limit(5);

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-8">
      {/* Top Header Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Good morning, {profile?.full_name?.split(" ")[0] || "Tutor"} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Here&apos;s what&apos;s happening with your students today.
          </p>
        </div>
        <div className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-3.5 py-1.5 rounded-full shadow-xs self-start sm:self-auto">
          {formattedDate}
        </div>
      </div>

      {/* 3 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Students Stat */}
        <Card className="bg-blue-50/50 border-blue-100 p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{studentCount || 0}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Students</p>
          </div>
        </Card>

        {/* Upcoming Sessions Stat */}
        <Card className="bg-amber-50/50 border-amber-100 p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{upcomingCount || 0}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Upcoming Sessions</p>
          </div>
        </Card>

        {/* Completed Sessions Stat */}
        <Card className="bg-emerald-50/50 border-emerald-100 p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center font-bold">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{completedCount || 0}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Sessions</p>
          </div>
        </Card>
      </div>

      {/* Upcoming Sessions List */}
      <Card className="p-0 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Upcoming Sessions</h2>
          <Link
            href="/tutor/sessions"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            View all
          </Link>
        </div>

        {!upcomingSessions || upcomingSessions.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No upcoming sessions scheduled yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {upcomingSessions.map((session) => {
              const studentName = session.students?.name || "Student";
              const dateObj = new Date(session.scheduled_at);
              const dateStr = dateObj.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
              const timeStr = dateObj.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <Link
                  key={session.id}
                  href={`/tutor/sessions/${session.id}`}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                      {studentName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{studentName}</p>
                      <p className="text-xs text-slate-500">{session.topic}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs font-medium text-slate-700">{dateStr}</p>
                      <p className="text-[11px] text-slate-400">{timeStr}</p>
                    </div>
                    <StatusBadge status={session.status} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
