"use client";
import { Milestone as MilestoneIcon } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill, MILESTONE_STATUS } from "@/components/ui/status-pill";
import { CommentsDisclosure } from "@/components/comments/CommentsDisclosure";
import type { Milestone, MilestoneStatus } from "@/lib/types";

/** Spine colour per state, so progress is legible at a glance down the rail. */
const SPINE: Record<MilestoneStatus, string> = {
  completed: "bg-success",
  in_progress: "bg-brand",
  upcoming: "bg-white/15",
  delayed: "bg-danger",
};

const DOT: Record<MilestoneStatus, string> = {
  completed: "bg-success-wash text-success ring-success/30",
  in_progress: "bg-brand-wash text-brand-soft ring-brand/40",
  upcoming: "bg-white/[0.06] text-faint ring-white/10",
  delayed: "bg-danger-wash text-danger ring-danger/30",
};

interface MilestoneTimelineProps {
  milestones: Milestone[];
  projectId: string;
  /** Hide the per-milestone comment threads (e.g. in the admin editor). */
  showComments?: boolean;
}

export function MilestoneTimeline({
  milestones,
  projectId,
  showComments = true,
}: MilestoneTimelineProps) {
  if (milestones.length === 0) {
    return (
      <EmptyState
        icon={MilestoneIcon}
        title="No milestones yet"
        description="Once the team maps out this project's phases, the full plan will appear here - finished, in progress, and still ahead."
      />
    );
  }

  const ordered = [...milestones].sort((a, b) => a.order_index - b.order_index);

  const done = ordered.filter((m) => m.status === "completed").length;
  const active = ordered.filter((m) => m.status === "in_progress").length;
  const ahead = ordered.filter(
    (m) => m.status === "upcoming" || m.status === "delayed"
  ).length;

  return (
    <div className="space-y-6">
      {/* The headline answer: done / in flight / still to come */}
      <div className="grid grid-cols-3 gap-3">
        <Tally label="Completed" value={done} tone="text-success" />
        <Tally label="In progress" value={active} tone="text-brand-soft" />
        <Tally label="Still ahead" value={ahead} tone="text-muted" />
      </div>

      <ol className="stagger">
        {ordered.map((m, idx) => {
          const isLast = idx === ordered.length - 1;
          const descriptor = MILESTONE_STATUS[m.status];
          const Icon = descriptor.icon;

          return (
            <li key={m.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-full ring-1",
                    DOT[m.status]
                  )}
                >
                  <Icon size={15} strokeWidth={2.25} aria-hidden="true" />
                </span>
                {!isLast && (
                  <span
                    className={cn("my-1 w-px flex-1 rounded-full", SPINE[m.status])}
                    aria-hidden="true"
                  />
                )}
              </div>

              <div className={cn("min-w-0 flex-1", isLast ? "pb-0" : "pb-6")}>
                <div className="glass rounded-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4
                        className={cn(
                          "text-sm font-semibold tracking-tight",
                          m.status === "completed" ? "text-muted" : "text-fg"
                        )}
                      >
                        {m.title}
                      </h4>
                      {m.description && (
                        <p className="mt-1.5 text-sm leading-relaxed text-subtle">
                          {m.description}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <StatusPill descriptor={descriptor} size="sm" />
                      {(m.due_date || m.completed_date) && (
                        <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-faint">
                          {m.status === "completed"
                            ? `Done ${formatDate(m.completed_date)}`
                            : `Due ${formatDate(m.due_date)}`}
                        </p>
                      )}
                    </div>
                  </div>

                  {showComments && (
                    <CommentsDisclosure
                      projectId={projectId}
                      targetType="milestone"
                      targetId={m.id}
                      label="Comment on this milestone"
                      emptyHint="Something look off, or want to suggest an addition to this phase? Leave a remark and the team will reply."
                    />
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Tally({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="glass rounded-card px-4 py-3">
      <p className={cn("tabular text-2xl font-semibold tracking-tight", tone)}>
        {value}
      </p>
      <p className="mt-0.5 text-xs text-subtle">{label}</p>
    </div>
  );
}
