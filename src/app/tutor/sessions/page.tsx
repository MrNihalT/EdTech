"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

interface StudentOption {
  id: string;
  name: string;
  subject: string;
}

interface Session {
  id: string;
  topic: string;
  scheduled_at: string;
  status: string;
  students: {
    name: string;
    subject: string;
  };
}

export default function TutorSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Schedule Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  const [formData, setFormData] = useState({
    student_id: "",
    scheduled_at: "",
    topic: "",
  });

  const supabase = createClient();

  const loadData = async () => {
    setIsLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsLoading(false);
      return;
    }

    // Fetch tutor's students
    const { data: studentData } = await supabase
      .from("students")
      .select("id, name, subject")
      .eq("tutor_id", user.id)
      .order("name", { ascending: true });

    if (studentData) {
      setStudents(studentData);
      setFormData((prev) => ({
        ...prev,
        student_id: prev.student_id || (studentData.length > 0 ? studentData[0].id : ""),
      }));
    }

    // Fetch sessions
    const { data: sessionData, error: sErr } = await supabase
      .from("sessions")
      .select("id, topic, scheduled_at, status, students(name, subject)")
      .eq("tutor_id", user.id)
      .order("scheduled_at", { ascending: false });

    if (sErr) {
      setError(`Failed to fetch sessions: ${sErr.message}`);
    } else {
      setSessions((sessionData as unknown as Session[]) || []);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      setIsLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !isMounted) {
        setIsLoading(false);
        return;
      }

      // Fetch tutor's students
      const { data: studentData } = await supabase
        .from("students")
        .select("id, name, subject")
        .eq("tutor_id", user.id)
        .order("name", { ascending: true });

      if (studentData && isMounted) {
        setStudents(studentData);
        setFormData((prev) => ({
          ...prev,
          student_id: prev.student_id || (studentData.length > 0 ? studentData[0].id : ""),
        }));
      }

      // Fetch sessions
      const { data: sessionData, error: sErr } = await supabase
        .from("sessions")
        .select("id, topic, scheduled_at, status, students(name, subject)")
        .eq("tutor_id", user.id)
        .order("scheduled_at", { ascending: false });

      if (isMounted) {
        if (sErr) {
          setError(`Failed to fetch sessions: ${sErr.message}`);
        } else {
          setSessions((sessionData as unknown as Session[]) || []);
        }
        setIsLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const handleScheduleSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    if (!formData.student_id || !formData.scheduled_at || !formData.topic) {
      setModalError("Please complete all required fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Ensure ISO format timestamp for scheduled_at
      const isoDate = new Date(formData.scheduled_at).toISOString();

      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: formData.student_id,
          scheduled_at: isoDate,
          topic: formData.topic,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setModalError(data.error || "Failed to schedule session.");
        setIsSubmitting(false);
        return;
      }

      // Success
      setIsModalOpen(false);
      setFormData({
        student_id: students.length > 0 ? students[0].id : "",
        scheduled_at: "",
        topic: "",
      });
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setModalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSessions = sessions.filter((s) => {
    if (statusFilter === "all") return true;
    return s.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sessions</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Schedule and manage all your 1-on-1 tutoring sessions.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} disabled={students.length === 0}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Schedule Session
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {["all", "scheduled", "in_progress", "completed", "ai_reviewed"].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
              statusFilter === st
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            {st.replace("_", " ")}
          </button>
        ))}
      </div>

      {error && <ErrorMessage message={error} />}

      {/* Sessions List */}
      {isLoading ? (
        <LoadingState message="Loading sessions..." />
      ) : filteredSessions.length === 0 ? (
        <Card className="text-center p-12 text-slate-500">
          <p className="font-semibold text-slate-700">No sessions found.</p>
          <p className="text-xs text-slate-400 mt-1">
            {students.length === 0
              ? "You need to add at least one student before scheduling a session."
              : "Click '+ Schedule Session' above to book a new session."}
          </p>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filteredSessions.map((session) => {
              const studentName = session.students?.name || "Student";
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
                <Link
                  key={session.id}
                  href={`/tutor/sessions/${session.id}`}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                      {studentName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{session.topic}</h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Student: {studentName} • {session.students?.subject}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-5">
                    <div className="text-right">
                      <p className="text-xs font-semibold text-slate-700">{dateStr}</p>
                      <p className="text-[11px] text-slate-400 font-medium">{timeStr}</p>
                    </div>
                    <StatusBadge status={session.status} />
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      {/* Schedule Session Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalError("");
        }}
        title="Schedule Session"
      >
        {modalError && <ErrorMessage message={modalError} />}
        <form onSubmit={handleScheduleSession} className="space-y-4">
          <Select
            label="Select Student"
            options={students.map((s) => ({
              label: `${s.name} (${s.subject})`,
              value: s.id,
            }))}
            value={formData.student_id}
            onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
            required
          />

          <Input
            label="Scheduled Date & Time"
            type="datetime-local"
            value={formData.scheduled_at}
            onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
            required
          />

          <Input
            label="Topic"
            placeholder="e.g. Quadratic Equations & Factoring"
            value={formData.topic}
            onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
            required
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Confirm Schedule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
