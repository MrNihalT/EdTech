"use client";

import React, { useState, useEffect, useCallback, useRef, use } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import { StatusBadge, SessionStatus } from "@/components/ui/StatusBadge";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

interface SessionDetail {
  id: string;
  topic: string;
  scheduled_at: string;
  status: SessionStatus;
  notes: string | null;
  students: {
    id: string;
    name: string;
    subject: string;
    current_level: string;
    learning_goals: string | null;
    weak_areas: string | null;
  };
}

interface AILessonPlanData {
  objectives: string[];
  lesson_outline: string[];
  practice_questions: string[];
}

interface AISessionReviewData {
  summary: string;
  homework: string[];
  next_topic: string | null;
}

export default function SessionWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: sessionId } = use(params);

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [lessonPlan, setLessonPlan] = useState<AILessonPlanData | null>(null);
  const [sessionReview, setSessionReview] = useState<AISessionReviewData | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Notes & Autosave state
  const [notes, setNotes] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // AI Loading states
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isGeneratingReview, setIsGeneratingReview] = useState(false);
  const [isTransitioningState, setIsTransitioningState] = useState(false);
  const [aiError, setAiError] = useState("");

  const supabase = createClient();

  const fetchSessionWorkspace = useCallback(async () => {
    setIsLoading(true);
    setError("");

    // Fetch session details
    const { data: sessData, error: sessErr } = await supabase
      .from("sessions")
      .select("*, students(*)")
      .eq("id", sessionId)
      .single();

    if (sessErr || !sessData) {
      setError("Session not found.");
      setIsLoading(false);
      return;
    }

    setSession(sessData as unknown as SessionDetail);
    setNotes(sessData.notes || "");

    // Fetch existing AI lesson plan if generated
    const { data: planData } = await supabase
      .from("ai_session_plans")
      .select("objectives, lesson_outline, practice_questions")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (planData) {
      setLessonPlan({
        objectives: Array.isArray(planData.objectives) ? planData.objectives : [],
        lesson_outline: Array.isArray(planData.lesson_outline) ? planData.lesson_outline : [],
        practice_questions: Array.isArray(planData.practice_questions) ? planData.practice_questions : [],
      });
    }

    // Fetch existing AI review if generated
    const { data: reviewData } = await supabase
      .from("ai_session_reviews")
      .select("summary, homework, next_topic")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (reviewData) {
      setSessionReview({
        summary: reviewData.summary,
        homework: Array.isArray(reviewData.homework) ? reviewData.homework : [],
        next_topic: reviewData.next_topic,
      });
    }

    setIsLoading(false);
  }, [sessionId, supabase]);

  useEffect(() => {
    fetchSessionWorkspace();
  }, [fetchSessionWorkspace]);

  // Debounced ~700ms autosave function for notes
  const saveNotesToServer = useCallback(
    async (updatedNotes: string) => {
      setSaveStatus("saving");
      try {
        const res = await fetch(`/api/sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: updatedNotes }),
        });
        if (res.ok) {
          setSaveStatus("saved");
        } else {
          setSaveStatus("unsaved");
        }
      } catch {
        setSaveStatus("unsaved");
      }
    },
    [sessionId]
  );

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotes(val);
    setSaveStatus("unsaved");

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      saveNotesToServer(val);
    }, 700);
  };

  // State Transition Handlers
  const handleStartSession = async () => {
    setIsTransitioningState(true);
    setAiError("");
    try {
      const res = await fetch(`/api/sessions/${sessionId}/start`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || "Failed to start session.");
      } else {
        setSession((prev) => (prev ? { ...prev, status: "in_progress" } : null));
      }
    } catch (err: any) {
      setAiError(err.message || "An unexpected error occurred.");
    } finally {
      setIsTransitioningState(false);
    }
  };

  const handleCompleteSession = async () => {
    setIsTransitioningState(true);
    setAiError("");
    try {
      // Ensure notes are saved before completing
      if (saveStatus === "unsaved") {
        await saveNotesToServer(notes);
      }

      const res = await fetch(`/api/sessions/${sessionId}/complete`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || "Failed to complete session.");
      } else {
        setSession((prev) => (prev ? { ...prev, status: "completed" } : null));
      }
    } catch (err: any) {
      setAiError(err.message || "An unexpected error occurred.");
    } finally {
      setIsTransitioningState(false);
    }
  };

  // AI Generators
  const handleGeneratePlan = async () => {
    setIsGeneratingPlan(true);
    setAiError("");
    try {
      const res = await fetch(`/api/sessions/${sessionId}/plan`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || "Failed to generate AI lesson plan.");
      } else {
        setLessonPlan(data.plan);
      }
    } catch (err: any) {
      setAiError(err.message || "An unexpected error occurred.");
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleGenerateReview = async () => {
    setIsGeneratingReview(true);
    setAiError("");
    try {
      const res = await fetch(`/api/sessions/${sessionId}/review`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || "Failed to generate AI review.");
      } else {
        setSessionReview(data.review);
        setSession((prev) => (prev ? { ...prev, status: "ai_reviewed" } : null));
      }
    } catch (err: any) {
      setAiError(err.message || "An unexpected error occurred.");
    } finally {
      setIsGeneratingReview(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading session workspace..." />;
  }

  if (error || !session) {
    return <ErrorMessage message={error || "Session not found."} />;
  }

  const studentName = session.students?.name || "Student";
  const isCompleted = session.status === "completed" || session.status === "ai_reviewed";
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
      {/* Back Link */}
      <Link
        href="/tutor/sessions"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Sessions
      </Link>

      {/* Header Bar */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{session.topic}</h1>
              <StatusBadge status={session.status} />
            </div>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Student:{" "}
              <Link
                href={`/tutor/students/${session.students?.id}`}
                className="text-blue-600 font-semibold hover:underline"
              >
                {studentName}
              </Link>{" "}
              • {dateStr} at {timeStr}
            </p>
          </div>

          {/* Lifecycle Action Buttons */}
          <div className="flex items-center gap-3">
            {session.status === "scheduled" && (
              <Button onClick={handleStartSession} isLoading={isTransitioningState}>
                Start Session
              </Button>
            )}

            {session.status === "in_progress" && (
              <Button
                variant="primary"
                onClick={handleCompleteSession}
                isLoading={isTransitioningState}
              >
                Mark Session Completed
              </Button>
            )}

            {session.status === "completed" && (
              <Button
                onClick={handleGenerateReview}
                isLoading={isGeneratingReview}
              >
                Generate AI Review
              </Button>
            )}

            {session.status === "ai_reviewed" && (
              <Button
                variant="secondary"
                onClick={handleGenerateReview}
                isLoading={isGeneratingReview}
              >
                Regenerate AI Review
              </Button>
            )}
          </div>
        </div>
      </Card>

      {aiError && <ErrorMessage message={aiError} />}

      {/* Workspace Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: AI Lesson Plan */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  AI
                </div>
                <h2 className="text-base font-bold text-slate-900">AI Lesson Plan</h2>
              </div>
              <Button
                size="sm"
                variant={lessonPlan ? "outline" : "primary"}
                onClick={handleGeneratePlan}
                isLoading={isGeneratingPlan}
              >
                {lessonPlan ? "Regenerate Plan" : "Generate Plan"}
              </Button>
            </div>

            {!lessonPlan ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Click &quot;Generate Plan&quot; to produce a personalized lesson plan using student history.
              </div>
            ) : (
              <div className="space-y-5 text-sm">
                {/* Objectives */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Objectives
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 font-medium">
                    {lessonPlan.objectives.map((obj, i) => (
                      <li key={i}>{obj}</li>
                    ))}
                  </ul>
                </div>

                {/* Lesson Outline */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Lesson Outline (4 Points)
                  </h4>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-700 font-medium">
                    {lessonPlan.lesson_outline.map((pt, i) => (
                      <li key={i}>{pt}</li>
                    ))}
                  </ol>
                </div>

                {/* Practice Questions */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Practice Questions
                  </h4>
                  <div className="space-y-2">
                    {lessonPlan.practice_questions.map((q, i) => (
                      <div key={i} className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 font-mono text-xs text-slate-800">
                        {i + 1}. {q}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* AI Session Review Card (if available) */}
          {sessionReview && (
            <Card className="p-6 bg-purple-50/40 border-purple-200">
              <div className="flex items-center gap-2 pb-3 border-b border-purple-100 mb-4">
                <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center text-xs font-bold">
                  AI
                </div>
                <h2 className="text-base font-bold text-purple-900">AI Session Review</h2>
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-1">
                    Summary
                  </h4>
                  <p className="text-slate-800 leading-relaxed font-medium">{sessionReview.summary}</p>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-1">
                    Assigned Homework
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-800 font-medium">
                    {sessionReview.homework.map((hw, i) => (
                      <li key={i}>{hw}</li>
                    ))}
                  </ul>
                </div>

                {sessionReview.next_topic && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-1">
                      Next Topic Suggestion
                    </h4>
                    <p className="text-slate-800 font-medium">{sessionReview.next_topic}</p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Tutor Notes Textarea with Debounced Autosave */}
        <div>
          <Card className="p-6 h-full flex flex-col justify-between min-h-[420px]">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h2 className="text-base font-bold text-slate-900">Tutor Notes</h2>
                <div className="text-xs font-semibold">
                  {saveStatus === "saving" && <span className="text-amber-600 animate-pulse">Saving...</span>}
                  {saveStatus === "saved" && <span className="text-emerald-600">Autosaved ✓</span>}
                  {saveStatus === "unsaved" && <span className="text-slate-400">Unsaved changes</span>}
                </div>
              </div>

              <Textarea
                placeholder={
                  isCompleted
                    ? "Session completed. Notes are read-only."
                    : "Type session notes here... (autosaves automatically after typing)"
                }
                value={notes}
                onChange={handleNotesChange}
                disabled={isCompleted}
                className="min-h-[320px] font-sans text-sm leading-relaxed resize-y"
              />
            </div>

            {isCompleted && (
              <div className="mt-4 text-xs text-slate-400 font-medium text-center bg-slate-50 p-2.5 rounded-lg">
                🔒 Notes are locked because this session is completed.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
