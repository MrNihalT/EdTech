import React from "react";

export type SessionStatus = "scheduled" | "in_progress" | "completed" | "ai_reviewed";

interface StatusBadgeProps {
  status: SessionStatus | string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const configs: Record<
    string,
    { label: string; className: string }
  > = {
    scheduled: {
      label: "Scheduled",
      className: "bg-blue-50 text-blue-700 border-blue-200",
    },
    in_progress: {
      label: "In Progress",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    completed: {
      label: "Completed",
      className: "bg-slate-100 text-slate-700 border-slate-200",
    },
    ai_reviewed: {
      label: "AI Reviewed",
      className: "bg-purple-50 text-purple-700 border-purple-200",
    },
  };

  const config = configs[status] || {
    label: status,
    className: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.className}`}
    >
      {config.label}
    </span>
  );
}
