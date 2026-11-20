"use client";
import { Suspense, useDeferredValue, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Archive, Plus, Search, SquareKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Board } from "@/components/tasks/Board";
import { TaskCardBody } from "@/components/tasks/parts";
import { NewTaskDialog } from "@/components/tasks/NewTaskDialog";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { useCurrentUser } from "@/hooks/useAuth";
import { useDepartments } from "@/hooks/useDepartments";
import { useAssignablePeople, useTasks } from "@/hooks/useTasks";
import {
  TASK_PRIORITIES, TASK_PRIORITY_LABELS, type TaskPriority, type TaskStatus,
} from "@/lib/types";

export default function TasksPage() {
  // useSearchParams needs a Suspense boundary to prerender.
  return (
    <Suspense fallback={null}>
      <Tasks />
    </Suspense>
  );
}

function Tasks() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data: me } = useCurrentUser();
  const isAdmin = me?.role === "admin";

  // Filters and the open task live in the URL, so a link (or a bell) can
  // land on exactly this view.
  const dept = params.get("dept") ?? "";
  const assignee = params.get("assignee") ?? "";
  const priority = (params.get("priority") ?? "") as TaskPriority | "";
  const archived = params.get("archived") === "1";
  const openId = params.get("task");
  const [q, setQ] = useState("");
  const query = useDeferredValue(q);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const s = next.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };

  const { data: tasks = [], isLoading } = useTasks({
    department_id: dept || undefined,
    assignee: assignee || undefined,
    priority,
    q: query,
    archived,
  });
  const { data: departments = [] } = useDepartments();
  const { data: people = [] } = useAssignablePeople();
  const [creating, setCreating] = useState<TaskStatus | null>(null);
  const filtered = !!(dept || assignee || priority || query.trim());

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-normal tracking-tight text-fg-strong">Tasks</h1>
          <p className="mt-2 max-w-xl text-sm text-subtle">
            Who is doing what. Drag a card to move it along; open it to comment or see its history.
          </p>
        </div>
        <Button onClick={() => setCreating("todo")}>
          <Plus size={15} aria-hidden="true" />
          New task
        </Button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="relative min-w-[13rem] flex-1">
          <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-subtle" />
          <Input
            aria-label="Search tasks"
            placeholder="Search tasks"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-6"
          />
        </div>
        <Button
          variant={assignee === "me" ? "default" : "ghost"}
          size="sm"
          aria-pressed={assignee === "me"}
          onClick={() => setParam("assignee", assignee === "me" ? null : "me")}
        >
          Mine
        </Button>
        <div className="w-40">
          <Select aria-label="Assignee" value={assignee} onChange={(e) => setParam("assignee", e.target.value || null)}>
            <option value="">Everyone</option>
            <option value="me">Assigned to me</option>
            <option value="none">Unassigned</option>
            {people.filter((p) => p.user_id !== me?.id).map((p) => (
              <option key={p.user_id} value={p.user_id}>{p.name}</option>
            ))}
          </Select>
        </div>
        <div className="w-40">
          <Select aria-label="Department" value={dept} onChange={(e) => setParam("dept", e.target.value || null)}>
            <option value="">All departments</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </div>
        <div className="w-32">
          <Select aria-label="Priority" value={priority} onChange={(e) => setParam("priority", e.target.value || null)}>
            <option value="">Any priority</option>
            {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</option>)}
          </Select>
        </div>
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={archived}
          onClick={() => setParam("archived", archived ? null : "1")}
        >
          <Archive size={14} aria-hidden="true" />
          {archived ? "Showing archived" : "Archived"}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-72 w-full" />)}
        </div>
      ) : archived ? (
        tasks.length === 0 ? (
          <Card><EmptyState icon={Archive} title="Nothing archived" description="Archived tasks leave the board but keep their comments and history." /></Card>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {tasks.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => setParam("task", t.id)} className="glass block w-full cursor-pointer px-3.5 py-3 text-left hover:border-hairline-strong">
                  <TaskCardBody task={t} />
                </button>
              </li>
            ))}
          </ul>
        )
      ) : tasks.length === 0 && !filtered ? (
        <Card>
          <EmptyState
            icon={SquareKanban}
            title="No tasks yet"
            description="Create the first one - give it an owner and a due date, and it shows up on their board."
            action={
              <Button onClick={() => setCreating("todo")}>
                <Plus size={14} aria-hidden="true" />
                New task
              </Button>
            }
          />
        </Card>
      ) : (
        <Board tasks={tasks} onOpen={(id) => setParam("task", id)} onAdd={(s) => setCreating(s)} />
      )}

      {creating && (
        <NewTaskDialog
          isAdmin={isAdmin}
          defaults={{
            status: creating,
            department_id: dept || null,
            assignee_id: assignee === "me" ? me?.id ?? null : assignee && assignee !== "none" ? assignee : null,
          }}
          onClose={() => setCreating(null)}
        />
      )}
      {openId && <TaskDrawer taskId={openId} isAdmin={isAdmin} onClose={() => setParam("task", null)} />}
    </div>
  );
}
