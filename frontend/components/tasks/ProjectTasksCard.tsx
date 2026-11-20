"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, SquareKanban } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DueChip, PriorityMark } from "@/components/tasks/parts";
import { NewTaskDialog } from "@/components/tasks/NewTaskDialog";
import { useTasks } from "@/hooks/useTasks";
import { TASK_STATUS_LABELS } from "@/lib/types";

/**
 * The team's internal tasks for one client project, on that project's admin
 * page. Clients never see these.
 */
export function ProjectTasksCard({ projectId }: { projectId: string }) {
  const { data: tasks = [] } = useTasks({ project_id: projectId });
  const [creating, setCreating] = useState(false);
  const open = tasks.filter((t) => t.status !== "done");

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-hairline px-5 py-4">
        <SquareKanban size={15} className="text-faint" aria-hidden="true" />
        <h2 className="text-sm font-semibold tracking-tight text-fg-strong">Internal tasks</h2>
        {open.length > 0 && <Badge>{open.length} open</Badge>}
        <span className="text-xs text-subtle">· the client doesn&apos;t see these</span>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="link-signal ml-auto inline-flex cursor-pointer items-center gap-1 text-xs"
        >
          <Plus size={12} aria-hidden="true" />
          New task
        </button>
      </div>
      {tasks.length === 0 ? (
        <p className="px-5 py-6 text-sm text-subtle">No tasks linked to this project.</p>
      ) : (
        <ul className="divide-y divide-hairline">
          {tasks.map((t) => (
            <li key={t.id}>
              <Link
                href={`/admin/tasks?task=${t.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-tint"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-fg">{t.title}</span>
                <PriorityMark priority={t.priority} />
                {t.due_date && <DueChip due={t.due_date} done={t.status === "done"} />}
                <span className="w-24 text-xs text-subtle">{TASK_STATUS_LABELS[t.status]}</span>
                {t.assignee ? (
                  <Avatar size="sm" name={t.assignee.name} src={t.assignee.avatar_url} />
                ) : (
                  <span className="w-7" aria-hidden="true" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {creating && (
        <NewTaskDialog isAdmin defaults={{ project_id: projectId }} onClose={() => setCreating(false)} />
      )}
    </Card>
  );
}
