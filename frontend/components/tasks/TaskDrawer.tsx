"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Lock, Send, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog } from "@/components/ui/dialog";
import { DepartmentDot } from "@/components/company/DepartmentChip";
import { DueChip, formatDue, PriorityMark } from "@/components/tasks/parts";
import { useDepartments } from "@/hooks/useDepartments";
import {
  useAddComment, useAssignablePeople, useDeleteComment, useDeleteTask, useProjectOptions,
  useTask, useTaskActivity, useTaskComments, useUpdateTask,
} from "@/hooks/useTasks";
import { errorDetail } from "@/hooks/useEngagements";
import { ReadOnlyProvider } from "@/lib/read-only";
import { timeAgo } from "@/lib/utils";
import {
  TASK_PRIORITIES, TASK_PRIORITY_LABELS, TASK_STATUSES, TASK_STATUS_LABELS,
  type Task, type TaskActivity, type TaskInput, type TaskStatus,
} from "@/lib/types";

const label = (s: unknown) => TASK_STATUS_LABELS[s as TaskStatus] ?? String(s);

/** One line of history, e.g. "moved this to In review". */
export function describeActivity(a: TaskActivity): string {
  const d = (a.data ?? {}) as Record<string, string | boolean | string[] | null>;
  switch (a.kind) {
    case "created": return "created this task";
    case "assigned":
      return d.to ? `assigned it to ${d.to}` : d.from ? `unassigned ${d.from}` : "changed the assignee";
    case "status": return `moved this to ${label(d.to)}`;
    case "priority": return `set priority to ${TASK_PRIORITY_LABELS[d.to as keyof typeof TASK_PRIORITY_LABELS] ?? d.to}`;
    case "due": return d.to ? `set the due date to ${formatDue(String(d.to))}` : "removed the due date";
    case "department": return d.to ? `moved it to ${d.to}` : `took it out of ${d.from}`;
    case "project": return d.linked ? "linked a client project" : "unlinked the client project";
    case "edited": return `edited the ${(d.fields as string[] | undefined)?.join(" and ") ?? "task"}`;
    case "comment": return "commented";
    case "archived": return "archived this task";
    case "restored": return "restored this task";
    default: return a.kind;
  }
}

function Row({ label: text, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] items-center gap-3">
      <span className="text-xs text-subtle">{text}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Details({ task, isAdmin }: { task: Task; isAdmin: boolean }) {
  const update = useUpdateTask();
  const { data: people = [] } = useAssignablePeople();
  const { data: departments = [] } = useDepartments();
  const projects = useProjectOptions({ enabled: isAdmin });
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  // The last server value each field was in step with. When the server's
  // value changes, a field takes it only if the person hasn't edited that
  // field since - an unsaved draft is never overwritten (they save on blur,
  // and another field's save can land while they're mid-sentence). Each
  // field is tracked on its own.
  const [seenTitle, setSeenTitle] = useState(task.title);
  const [seenDescription, setSeenDescription] = useState(task.description ?? "");
  if (task.title !== seenTitle) {
    setSeenTitle(task.title);
    if (title === seenTitle) setTitle(task.title);
  }
  if ((task.description ?? "") !== seenDescription) {
    setSeenDescription(task.description ?? "");
    if (description === seenDescription) setDescription(task.description ?? "");
  }

  const save = (data: Partial<TaskInput> & { is_archived?: boolean }, ok?: string) =>
    update.mutate(
      { id: task.id, data },
      {
        onSuccess: () => ok && toast.success(ok),
        onError: (e) => toast.error(errorDetail(e, "Couldn't save that change")),
      }
    );

  // A former colleague stays selectable as the current value only.
  const assigneeGone = task.assignee && !people.some((p) => p.user_id === task.assignee!.user_id);

  return (
    <div className="space-y-6">
      <div>
        <Input
          aria-label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && title.trim() !== task.title && save({ title: title.trim() })}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="h-auto border-transparent py-1 text-xl font-normal tracking-tight text-fg-strong sm:h-auto sm:text-xl"
          maxLength={255}
        />
        {!task.can_edit && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-subtle">
            <Lock size={11} aria-hidden="true" />
            You can comment here; changes are for whoever created it, is assigned, or is in its department.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <Row label="Status">
          <Select aria-label="Status" value={task.status} onChange={(e) => save({ status: e.target.value as TaskStatus })}>
            {TASK_STATUSES.map((s) => <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>)}
          </Select>
        </Row>
        <Row label="Assignee">
          <Select
            aria-label="Assignee"
            value={task.assignee?.user_id ?? ""}
            onChange={(e) => save({ assignee_id: e.target.value || null })}
          >
            <option value="">Unassigned</option>
            {assigneeGone && <option value={task.assignee!.user_id}>{task.assignee!.name} (left)</option>}
            {people.map((p) => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}
          </Select>
        </Row>
        <Row label="Priority">
          <Select
            aria-label="Priority"
            value={task.priority}
            onChange={(e) => save({ priority: e.target.value as TaskInput["priority"] })}
          >
            {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</option>)}
          </Select>
        </Row>
        <Row label="Due">
          <Input
            aria-label="Due date"
            type="date"
            value={task.due_date ?? ""}
            onChange={(e) => save({ due_date: e.target.value || null })}
          />
        </Row>
        <Row label="Department">
          <Select
            aria-label="Department"
            value={task.department?.id ?? ""}
            onChange={(e) => save({ department_id: e.target.value || null })}
          >
            <option value="">None</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Row>
        <Row label="Client project">
          {isAdmin ? (
            <Select
              aria-label="Client project"
              value={task.project?.id ?? ""}
              onChange={(e) => save({ project_id: e.target.value || null })}
            >
              <option value="">None - internal</option>
              {task.project && !projects.some((p) => p.id === task.project!.id) && (
                <option value={task.project.id}>{task.project.label}</option>
              )}
              {projects.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </Select>
          ) : (
            <span className="text-sm text-muted">{task.project?.label ?? "None - internal"}</span>
          )}
        </Row>
      </div>

      <div>
        <p className="mb-2 text-xs text-subtle">Details</p>
        <Textarea
          aria-label="Details"
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => description !== (task.description ?? "") && save({ description: description || null })}
          placeholder={task.can_edit ? "Add context, links, acceptance criteria…" : "No details."}
        />
      </div>

      <p className="text-xs text-subtle">
        Created by {task.creator?.name ?? "someone"} · {timeAgo(task.created_at)}
      </p>
    </div>
  );
}

function Comments({ task }: { task: Task }) {
  const { data: comments = [], isLoading } = useTaskComments(task.id);
  const add = useAddComment(task.id);
  const remove = useDeleteComment(task.id);
  const [body, setBody] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    add.mutate(text, {
      onSuccess: () => setBody(""),
      onError: (err) => toast.error(errorDetail(err, "Couldn't post that comment")),
    });
  };

  return (
    <section aria-label="Comments">
      <h3 className="mb-3 text-sm font-semibold text-fg-strong">Comments</h3>
      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : comments.length === 0 ? (
        <p className="mb-4 text-sm text-subtle">No comments yet.</p>
      ) : (
        <ul className="mb-4 space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="group flex gap-3">
              <Avatar size="sm" name={c.author?.name} src={c.author?.avatar_url} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-subtle">
                  <span className="font-medium text-fg">{c.author?.name ?? "Someone"}</span> · {timeAgo(c.created_at)}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted">{c.body}</p>
              </div>
              {c.can_delete && (
                <button
                  type="button"
                  onClick={() => remove.mutate(c.id, { onError: (e) => toast.error(errorDetail(e, "Couldn't delete that")) })}
                  aria-label="Delete comment"
                  className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center text-faint opacity-0 transition-opacity hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 size={12} aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {/* Anyone on the team may comment, even on a task they can't change. */}
      <ReadOnlyProvider value={false}>
        <form onSubmit={submit} className="flex items-end gap-2">
          <Textarea
            aria-label="Add a comment"
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(e);
            }}
            placeholder="Add a comment…"
          />
          <Button type="submit" size="sm" loading={add.isPending} disabled={!body.trim()} aria-label="Post comment">
            {!add.isPending && <Send size={13} aria-hidden="true" />}
          </Button>
        </form>
      </ReadOnlyProvider>
    </section>
  );
}

function History({ taskId }: { taskId: string }) {
  const { data: activity = [] } = useTaskActivity(taskId);
  if (activity.length === 0) return null;
  return (
    <section aria-label="History">
      <h3 className="mb-3 text-sm font-semibold text-fg-strong">History</h3>
      <ol className="space-y-2.5 border-l border-hairline pl-4">
        {activity.map((a) => (
          <li key={a.id} className="text-xs leading-relaxed text-subtle">
            <span className="text-muted">{a.actor?.name ?? "Someone"}</span> {describeActivity(a)}
            <span className="text-faint"> · {timeAgo(a.created_at)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function TaskDrawer({
  taskId, isAdmin, onClose,
}: { taskId: string; isAdmin: boolean; onClose: () => void }) {
  const { data: task, isLoading, isError } = useTask(taskId);
  const update = useUpdateTask();
  const del = useDeleteTask();

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()} label={task ? `Task: ${task.title}` : "Task"} placement="side">
      <div className="glass-strong flex h-full w-full flex-col border-y-0 border-r-0 shadow-[0_32px_80px_-24px_rgba(0,0,0,0.9)]">
        <div className="flex items-center gap-2 border-b border-hairline px-5 py-3">
          {task && (
            <>
              <PriorityMark priority={task.priority} withLabel />
              {task.department && (
                <span className="inline-flex items-center gap-1.5 text-xs text-subtle">
                  <DepartmentDot colour={task.department.colour} />
                  {task.department.name}
                </span>
              )}
              {task.due_date && <DueChip due={task.due_date} done={task.status === "done"} />}
            </>
          )}
          <div className="ml-auto flex items-center">
            {task?.can_edit && (
              <button
                type="button"
                onClick={() =>
                  update.mutate(
                    { id: task.id, data: { is_archived: !task.is_archived } },
                    {
                      onSuccess: () => {
                        toast.success(task.is_archived ? "Task restored" : "Task archived");
                        if (!task.is_archived) onClose();
                      },
                      onError: (e) => toast.error(errorDetail(e, "Couldn't change that")),
                    }
                  )
                }
                aria-label={task.is_archived ? "Restore task" : "Archive task"}
                title={task.is_archived ? "Restore" : "Archive"}
                className="grid h-9 w-9 cursor-pointer place-items-center text-subtle hover:bg-tint-strong hover:text-fg"
              >
                {task.is_archived ? <ArchiveRestore size={15} aria-hidden="true" /> : <Archive size={15} aria-hidden="true" />}
              </button>
            )}
            {task?.can_delete && (
              <button
                type="button"
                onClick={() => {
                  if (!window.confirm(`Delete "${task.title}"? Its comments and history go too. Archive keeps them.`)) return;
                  del.mutate(task.id, {
                    onSuccess: () => {
                      toast.success("Task deleted");
                      onClose();
                    },
                    onError: (e) => toast.error(errorDetail(e, "Couldn't delete that task")),
                  });
                }}
                aria-label="Delete task"
                title="Delete"
                className="grid h-9 w-9 cursor-pointer place-items-center text-subtle hover:bg-danger-wash hover:text-danger"
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              data-dialog-close
              onClick={onClose}
              aria-label="Close task"
              className="grid h-9 w-9 cursor-pointer place-items-center text-subtle hover:bg-tint-strong hover:text-fg"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-8 overflow-y-auto px-5 py-5">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : isError || !task ? (
            <p className="text-sm text-subtle">This task doesn&apos;t exist any more.</p>
          ) : (
            <>
              {task.is_archived && (
                <p className="border border-hairline px-3 py-2 text-xs text-subtle">Archived - hidden from the board.</p>
              )}
              {/* Fields follow this task's own rules, not the page's. */}
              <ReadOnlyProvider value={!task.can_edit}>
                <Details task={task} isAdmin={isAdmin} />
              </ReadOnlyProvider>
              <Comments task={task} />
              <History taskId={task.id} />
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
}

