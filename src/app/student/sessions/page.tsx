import React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default async function StudentSessionsPage() {
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
    return <Card className="p-8 text-center text-slate-500">Student profile not found.</Card>;
  }

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .eq("student_id", studentRecord.id)
    .order("scheduled_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Sessions</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          View all your scheduled, past, and reviewed tutoring sessions.
        </p>
      </div>

      {!sessions || sessions.length === 0 ? (
        <Card className="p-12 text-center text-slate-500">No sessions scheduled yet.</Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {sessions.map((s) => {
              const dateObj = new Date(s.scheduled_at);
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
                <Link
                  key={s.id}
                  href={`/student/sessions/${s.id}`}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{s.topic}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {dateStr} at {timeStr}
                    </p>
                  </div>
                  <StatusBadge status={s.status} />
                </Link>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
