"use client";
import { CalendarClock, MessageSquare } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { DepartmentDot } from "@/components/company/DepartmentChip";
import { cn } from "@/lib/utils";
import { TASK_PRIORITY_LABELS, type Task, type TaskPriority } from "@/lib/types";

/** Days from today to an ISO date (yyyy-mm-dd), in the viewer's own calendar. */
export function daysUntilDate(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const due = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

export function formatDue(iso: string): string {
  const n = daysUntilDate(iso);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) });
}

/**
 * Urgent takes the signal red - it is the one thing on the board that should
 * pull the eye. High is amber; normal and low stay quiet.
 */
export function PriorityMark({ priority, withLabel = false }: { priority: TaskPriority; withLabel?: boolean }) {
  if (priority === "normal" && !withLabel) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider",
        priority === "urgent" && "text-fg",
        priority === "high" && "text-warning",
        (priority === "normal" || priority === "low") && "text-subtle"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-1.5 w-1.5",
          priority === "urgent" && "bg-brand",
          priority === "high" && "bg-warning",
          priority === "normal" && "bg-hairline-strong",
          priority === "low" && "border border-hairline-strong"
        )}
      />
      {TASK_PRIORITY_LABELS[priority]}
    </span>
  );
}

export function DueChip({ due, done }: { due: string; done: boolean }) {
  const n = daysUntilDate(due);
  const overdue = !done && n < 0;
  const soon = !done && n >= 0 && n <= 2;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px]",
        overdue ? "text-danger" : soon ? "text-warning" : "text-subtle"
      )}
      title={overdue ? "Overdue" : undefined}
    >
      <CalendarClock size={11} aria-hidden="true" />
      {overdue ? `${formatDue(due)} · overdue` : formatDue(due)}
    </span>
  );
}

export function TaskCardBody({ task }: { task: Task }) {
  const done = task.status === "done";
  return (
    <>
      {(task.priority !== "normal" || task.department) && (
        <div className="mb-1.5 flex items-center gap-2">
          <PriorityMark priority={task.priority} />
          {task.department && (
            <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] text-subtle">
              <DepartmentDot colour={task.department.colour} />
              <span className="truncate">{task.department.name}</span>
            </span>
          )}
        </div>
      )}
      <p className={cn("text-sm leading-snug text-fg", done && "text-muted line-through decoration-hairline-strong")}>
        {task.title}
      </p>
      {task.project && <p className="mt-1 truncate text-[11px] text-subtle">{task.project.label}</p>}
      <div className="mt-2.5 flex items-center gap-3">
        {task.due_date && <DueChip due={task.due_date} done={done} />}
        {task.comment_count > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] text-subtle">
            <MessageSquare size={11} aria-hidden="true" />
            {task.comment_count}
          </span>
        )}
        <span className="ml-auto">
          {task.assignee ? (
            <Avatar
              size="sm"
              name={task.assignee.name}
              src={task.assignee.avatar_url}
              className={cn(!task.assignee.is_current && "opacity-50")}
            />
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-wider text-faint">Unassigned</span>
          )}
        </span>
      </div>
    </>
  );
}
