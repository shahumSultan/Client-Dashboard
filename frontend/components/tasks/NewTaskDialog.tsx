"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import {
  Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useDepartments } from "@/hooks/useDepartments";
import { useAssignablePeople, useCreateTask, useProjectOptions } from "@/hooks/useTasks";
import { errorDetail } from "@/hooks/useEngagements";
import {
  TASK_PRIORITIES, TASK_PRIORITY_LABELS, TASK_STATUSES, TASK_STATUS_LABELS,
  type TaskInput, type TaskStatus,
} from "@/lib/types";

export function NewTaskDialog({
  isAdmin,
  defaults,
  onClose,
  onCreated,
}: {
  isAdmin: boolean;
  defaults?: Partial<TaskInput>;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const create = useCreateTask();
  const { data: people = [] } = useAssignablePeople();
  const { data: departments = [] } = useDepartments();
  const projects = useProjectOptions({ enabled: isAdmin });
  const [form, setForm] = useState<TaskInput>({
    title: "", description: null, status: "todo", priority: "normal",
    department_id: null, assignee_id: null, project_id: null, due_date: null,
    ...defaults,
  });
  const set = <K extends keyof TaskInput>(k: K, v: TaskInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.title.trim()) return;
    create.mutate(form, {
      onSuccess: (task) => {
        toast.success("Task created");
        onCreated?.(task.id);
        onClose();
      },
      onError: (err) => toast.error(errorDetail(err, "Couldn't create that task")),
    });
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()} label="New task">
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>New task</DialogTitle>
            <DialogClose onClick={onClose} />
          </DialogHeader>
          <div className="grid gap-5 px-6 pb-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="What needs doing" htmlFor="task-title" required>
                <Input
                  id="task-title"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="Send the Northwind proposal"
                  maxLength={255}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Details" htmlFor="task-description">
                <Textarea
                  id="task-description"
                  rows={3}
                  value={form.description ?? ""}
                  onChange={(e) => set("description", e.target.value || null)}
                />
              </Field>
            </div>
            <Field label="Assignee" htmlFor="task-assignee">
              <Select
                id="task-assignee"
                value={form.assignee_id ?? ""}
                onChange={(e) => set("assignee_id", e.target.value || null)}
              >
                <option value="">Unassigned</option>
                {people.map((p) => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="Department" htmlFor="task-department">
              <Select
                id="task-department"
                value={form.department_id ?? ""}
                onChange={(e) => set("department_id", e.target.value || null)}
              >
                <option value="">None</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </Field>
            <Field label="Priority" htmlFor="task-priority">
              <Select
                id="task-priority"
                value={form.priority}
                onChange={(e) => set("priority", e.target.value as TaskInput["priority"])}
              >
                {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</option>)}
              </Select>
            </Field>
            <Field label="Due" htmlFor="task-due">
              <Input
                id="task-due"
                type="date"
                value={form.due_date ?? ""}
                onChange={(e) => set("due_date", e.target.value || null)}
              />
            </Field>
            <Field label="Column" htmlFor="task-status">
              <Select
                id="task-status"
                value={form.status}
                onChange={(e) => set("status", e.target.value as TaskStatus)}
              >
                {TASK_STATUSES.map((s) => <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>)}
              </Select>
            </Field>
            {isAdmin && (
              <Field label="Client project" htmlFor="task-project" hint="Optional. Employees see the name only.">
                <Select
                  id="task-project"
                  value={form.project_id ?? ""}
                  onChange={(e) => set("project_id", e.target.value || null)}
                >
                  <option value="">None - internal</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </Select>
              </Field>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={create.isPending} disabled={!form.title.trim()}>
              Create task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
