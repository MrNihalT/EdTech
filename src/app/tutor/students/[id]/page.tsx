"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

interface StudentDetail {
  id: string;
  name: string;
  subject: string;
  current_level: string;
  learning_goals: string | null;
  weak_areas: string | null;
}

interface Session {
  id: string;
  topic: string;
  scheduled_at: string;
  status: string;
}

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: studentId } = use(params);

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // AI Progress Summary state
  const [progressSummary, setProgressSummary] = useState<string | null>(null);
  const [isGeneratingProgress, setIsGeneratingProgress] = useState(false);
  const [progressError, setProgressError] = useState("");

  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;

    async function fetchStudentData() {
      setIsLoading(true);
      setError("");

      // Fetch student info
      const { data: studentData, error: sErr } = await supabase
        .from("students")
        .select("*")
        .eq("id", studentId)
        .single();

      if (!isMounted) return;

      if (sErr || !studentData) {
        setError("Student not found.");
        setIsLoading(false);
        return;
      }

      setStudent(studentData);

      // Fetch sessions
      const { data: sessionData, error: sessErr } = await supabase
        .from("sessions")
        .select("id, topic, scheduled_at, status")
        .eq("student_id", studentId)
        .order("scheduled_at", { ascending: true });

      if (isMounted) {
        if (sessErr) {
          setError(`Failed to fetch sessions: ${sessErr.message}`);
        } else {
          setSessions(sessionData || []);
        }
        setIsLoading(false);
      }
    }

    fetchStudentData();

    return () => {
      isMounted = false;
    };
  }, [studentId, supabase]);

  const handleGenerateProgressSummary = async () => {
    setIsGeneratingProgress(true);
    setProgressError("");

    try {
      const res = await fetch(`/api/students/${studentId}/progress`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setProgressError(data.error || "Failed to generate progress summary.");
      } else {
        setProgressSummary(data.summary);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setProgressError(msg);
    } finally {
      setIsGeneratingProgress(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading student details..." />;
  }

  if (error || !student) {
    return <ErrorMessage message={error || "Student not found."} />;
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/tutor/students"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Students
      </Link>

      {/* Student Profile Card */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-2xl shadow-xs">
              {student.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{student.name}</h1>
              <p className="text-sm font-medium text-slate-500 mt-0.5">
                {student.subject} • <span className="text-blue-600 font-semibold">{student.current_level}</span>
              </p>
            </div>
          </div>

          <Button
            onClick={handleGenerateProgressSummary}
            isLoading={isGeneratingProgress}
            className="shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate Progress Summary
          </Button>
        </div>

        {/* Goals & Weak Areas Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/60">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Learning Goals
            </h3>
            <p className="text-sm text-slate-700 font-medium">
              {student.learning_goals || "No specific learning goals defined."}
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/60">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Weak Areas
            </h3>
            <p className="text-sm text-slate-700 font-medium">
              {student.weak_areas || "No weak areas noted."}
            </p>
          </div>
        </div>
      </Card>

      {/* AI Progress Summary Section */}
      {progressError && <ErrorMessage message={progressError} />}
      {progressSummary && (
        <Card className="bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border-blue-200 p-6">
          <div className="flex items-center gap-2.5 mb-3 text-blue-900 font-bold">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs">
              AI
            </div>
            <h2>Student Progress Summary</h2>
          </div>
          <p className="text-sm text-slate-800 leading-relaxed">{progressSummary}</p>
        </Card>
      )}

      {/* Sessions List */}
      <Card className="p-0 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Sessions History</h2>
          <span className="text-xs text-slate-400 font-medium">{sessions.length} sessions</span>
        </div>

        {sessions.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No sessions scheduled for this student yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sessions.map((sess) => {
              const dateObj = new Date(sess.scheduled_at);
              const dateStr = dateObj.toLocaleDateString("en-US", {
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
                  key={sess.id}
                  href={`/tutor/sessions/${sess.id}`}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">{sess.topic}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {dateStr} at {timeStr}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusBadge status={sess.status} />
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
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
