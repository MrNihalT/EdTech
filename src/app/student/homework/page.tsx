import React from "react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";

export default async function StudentHomeworkPage() {
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

  // Fetch all AI session reviews for this student
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, topic, scheduled_at, ai_session_reviews(homework)")
    .eq("student_id", studentRecord.id)
    .order("scheduled_at", { ascending: false });

  const homeworkList: { topic: string; date: string; task: string }[] = [];

  if (sessions) {
    for (const sess of sessions) {
      const rev = Array.isArray(sess.ai_session_reviews)
        ? sess.ai_session_reviews[0]
        : sess.ai_session_reviews;
      if (rev && Array.isArray(rev.homework)) {
        const dateStr = new Date(sess.scheduled_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        rev.homework.forEach((hw: string) => {
          homeworkList.push({
            topic: sess.topic,
            date: dateStr,
            task: hw,
          });
        });
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Assigned Homework</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Review homework tasks generated from your tutoring sessions.
        </p>
      </div>

      {homeworkList.length === 0 ? (
        <Card className="p-12 text-center text-slate-500 font-medium">
          No homework tasks assigned yet.
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="p-5 border-b border-slate-100 font-bold text-slate-900 text-sm">
            Homework Checklist ({homeworkList.length} items)
          </div>
          <div className="divide-y divide-slate-100">
            {homeworkList.map((item, idx) => (
              <div key={idx} className="p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  id={`hw-${idx}`}
                  className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor={`hw-${idx}`} className="flex-1 cursor-pointer">
                  <p className="text-sm font-semibold text-slate-800">{item.task}</p>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Topic: {item.topic} • Assigned {item.date}
                  </p>
                </label>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
