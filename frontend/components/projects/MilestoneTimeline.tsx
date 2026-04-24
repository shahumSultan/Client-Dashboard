import { CheckCircle2, Clock, Circle, AlertCircle } from "lucide-react";
import { cn, formatDate, STATUS_LABELS } from "@/lib/utils";
import type { Milestone } from "@/lib/types";

const STATUS_ICON = {
  completed: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50", line: "bg-emerald-200" },
  in_progress: { icon: Clock, color: "text-indigo-500", bg: "bg-indigo-50", line: "bg-indigo-200" },
  upcoming: { icon: Circle, color: "text-slate-400", bg: "bg-slate-50", line: "bg-slate-200" },
  delayed: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-50", line: "bg-red-200" },
};

interface MilestoneTimelineProps {
  milestones: Milestone[];
}

export function MilestoneTimeline({ milestones }: MilestoneTimelineProps) {
  if (!milestones.length) {
    return (
      <div className="text-center py-12 text-slate-400">
        <Circle size={32} className="mx-auto mb-2 text-slate-200" />
        <p className="text-sm">No milestones added yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {milestones.map((m, idx) => {
        const config = STATUS_ICON[m.status];
        const Icon = config.icon;
        const isLast = idx === milestones.length - 1;

        return (
          <div key={m.id} className="flex gap-4">
            {/* Timeline spine */}
            <div className="flex flex-col items-center">
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", config.bg)}>
                <Icon size={16} className={config.color} />
              </div>
              {!isLast && (
                <div className={cn("w-0.5 flex-1 mt-1 mb-1 min-h-4", config.line)} />
              )}
            </div>

            {/* Content */}
            <div className={cn("flex-1 pb-6", isLast && "pb-0")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className={cn(
                    "text-sm font-semibold",
                    m.status === "completed" ? "text-slate-500 line-through" : "text-slate-900"
                  )}>
                    {m.title}
                  </h4>
                  {m.description && (
                    <p className="text-xs text-slate-400 mt-0.5">{m.description}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className={cn(
                    "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                    config.bg,
                    config.color
                  )}>
                    {STATUS_LABELS[m.status]}
                  </span>
                  {(m.due_date || m.completed_date) && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      {m.status === "completed"
                        ? `Done ${formatDate(m.completed_date)}`
                        : `Due ${formatDate(m.due_date)}`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
