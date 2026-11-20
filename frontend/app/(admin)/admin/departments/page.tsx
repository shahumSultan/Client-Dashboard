"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Crown, Network, Pencil, Plus, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { DEPARTMENT_SWATCH, DepartmentDot } from "@/components/company/DepartmentChip";
import {
  useDeleteDepartment, useDepartmentMember, useDepartments, useSaveDepartment, useTeamAccounts,
} from "@/hooks/useDepartments";
import { useCurrentUser } from "@/hooks/useAuth";
import { errorDetail } from "@/hooks/useEngagements";
import {
  DEPARTMENT_COLOURS, type Department, type DepartmentColour, type DepartmentInput, type User,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const BLANK: DepartmentInput = {
  name: "", description: null, lead_user_id: null, colour: "slate", sort_order: 0,
};

function DepartmentDialog({
  dept, people, onClose,
}: { dept: Department | null; people: User[]; onClose: () => void }) {
  const save = useSaveDepartment();
  const [form, setForm] = useState<DepartmentInput>(() =>
    dept
      ? {
          name: dept.name, description: dept.description, lead_user_id: dept.lead?.user_id ?? null,
          colour: dept.colour, sort_order: dept.sort_order,
        }
      : BLANK
  );
  const set = <K extends keyof DepartmentInput>(k: K, v: DepartmentInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = () =>
    save.mutate(
      { id: dept?.id, data: form },
      {
        onSuccess: () => {
          toast.success(dept ? "Department updated" : "Department created");
          onClose();
        },
        onError: (e) => toast.error(errorDetail(e, "Couldn't save that department")),
      }
    );

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()} label="Department">
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{dept ? "Edit department" : "New department"}</DialogTitle>
          <DialogClose onClick={onClose} />
        </DialogHeader>
        <div className="space-y-5 px-6 pb-5">
          <Field label="Name" htmlFor="dept-name" required>
            <Input
              id="dept-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Engineering, Sales, Design…"
            />
          </Field>
          <Field label="What it does" htmlFor="dept-description">
            <Textarea
              id="dept-description"
              rows={2}
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
          <Field label="Lead" htmlFor="dept-lead" hint="Added to the department if they aren't in it yet.">
            <Select
              id="dept-lead"
              value={form.lead_user_id ?? ""}
              onChange={(e) => set("lead_user_id", e.target.value || null)}
            >
              <option value="">No lead</option>
              {people.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name ?? u.email}</option>
              ))}
            </Select>
          </Field>
          <fieldset>
            <legend className="mb-2.5 text-sm font-medium text-muted">Colour</legend>
            <div className="flex flex-wrap gap-2">
              {DEPARTMENT_COLOURS.map((c) => (
                <label
                  key={c}
                  className={cn(
                    "grid h-9 w-9 cursor-pointer place-items-center border transition-colors",
                    form.colour === c ? "border-fg" : "border-hairline hover:border-hairline-strong"
                  )}
                >
                  <input
                    type="radio"
                    name="dept-colour"
                    value={c}
                    checked={form.colour === c}
                    onChange={() => set("colour", c as DepartmentColour)}
                    className="sr-only"
                    aria-label={c}
                  />
                  <span className="h-4 w-4 rounded-full" style={{ background: DEPARTMENT_SWATCH[c] }} />
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={save.isPending} disabled={!form.name.trim()}>
            {dept ? "Save" : "Create department"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DepartmentCard({
  dept, people, canManage, onEdit,
}: { dept: Department; people: User[]; canManage: boolean; onEdit: () => void }) {
  const member = useDepartmentMember();
  const remove = useDeleteDepartment();
  const inDept = new Set(dept.members.map((m) => m.user_id));
  const addable = people.filter((u) => !inDept.has(u.id));

  const change = (userId: string, add: boolean, name: string) =>
    member.mutate(
      { deptId: dept.id, userId, add },
      {
        onSuccess: () => toast.success(add ? `${name} added to ${dept.name}` : `${name} removed from ${dept.name}`),
        onError: (e) => toast.error(errorDetail(e, "Couldn't change that")),
      }
    );

  return (
    <Card className="flex flex-col" role="region" aria-label={dept.name}>
      <div className="flex items-start gap-3 border-b border-hairline px-5 py-4">
        <DepartmentDot colour={dept.colour} className="mt-2" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-normal tracking-tight text-fg-strong">{dept.name}</h2>
          {dept.description && <p className="mt-0.5 text-sm text-subtle">{dept.description}</p>}
        </div>
        {canManage && (
          <div className="-mr-2 flex shrink-0">
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Edit ${dept.name}`}
              className="grid h-9 w-9 cursor-pointer place-items-center text-subtle hover:bg-tint-strong hover:text-fg"
            >
              <Pencil size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (!window.confirm(`Delete ${dept.name}? The people in it stay on the team.`)) return;
                remove.mutate(dept.id, {
                  onSuccess: () => toast.success("Department deleted"),
                  onError: (e) => toast.error(errorDetail(e, "Couldn't delete that department")),
                });
              }}
              aria-label={`Delete ${dept.name}`}
              className="grid h-9 w-9 cursor-pointer place-items-center text-subtle hover:bg-tint-strong hover:text-danger"
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {dept.members.length === 0 ? (
        <p className="flex-1 px-5 py-6 text-sm text-subtle">No one in this department yet.</p>
      ) : (
        <ul className="flex-1 divide-y divide-hairline">
          {dept.members.map((m) => {
            const isLead = dept.lead?.user_id === m.user_id;
            return (
              <li key={m.user_id} className="flex items-center gap-3 px-5 py-2.5">
                <Avatar name={m.name} email={m.email} src={m.avatar_url} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm text-fg">
                    {m.name}
                    {isLead && (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-subtle">
                        <Crown size={10} aria-hidden="true" />
                        Lead
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-subtle">{m.email}</p>
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => change(m.user_id, false, m.name)}
                    aria-label={`Remove ${m.name} from ${dept.name}`}
                    className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center text-faint hover:bg-danger-wash hover:text-danger"
                  >
                    <X size={13} aria-hidden="true" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canManage && addable.length > 0 && (
        <div className="border-t border-hairline px-5 py-3">
          <Select
            aria-label={`Add someone to ${dept.name}`}
            value=""
            disabled={member.isPending}
            onChange={(e) => {
              const u = addable.find((p) => p.id === e.target.value);
              if (u) change(u.id, true, u.full_name ?? u.email);
            }}
            className="text-sm"
          >
            <option value="">Add someone…</option>
            {addable.map((u) => (
              <option key={u.id} value={u.id}>{u.full_name ?? u.email}</option>
            ))}
          </Select>
        </div>
      )}
    </Card>
  );
}

export default function DepartmentsPage() {
  const { data: me } = useCurrentUser();
  const canManage = me?.role === "admin";
  const { data: depts = [], isLoading } = useDepartments();
  const { data: people = [] } = useTeamAccounts({ enabled: canManage });
  const [editing, setEditing] = useState<Department | null | "new">(null);

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-normal tracking-tight text-fg-strong">Departments</h1>
          <p className="mt-2 max-w-xl text-sm text-subtle">
            How the Enigma-Cube team is organised, and who leads each part of it.
          </p>
        </div>
        {canManage && depts.length > 0 && (
          <Button onClick={() => setEditing("new")}>
            <Plus size={15} aria-hidden="true" />
            New department
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => <Skeleton key={i} className="h-56 w-full" />)}
        </div>
      ) : depts.length === 0 ? (
        <Card>
          <EmptyState
            icon={Network}
            title="No departments yet"
            description={
              canManage
                ? "Group the team - Engineering, Sales, Design - so it's clear who works on what."
                : "An admin hasn't set any up yet."
            }
            action={
              canManage ? (
                <Button onClick={() => setEditing("new")}>
                  <Plus size={14} aria-hidden="true" />
                  New department
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="stagger grid gap-4 md:grid-cols-2">
          {depts.map((d) => (
            <DepartmentCard
              key={d.id}
              dept={d}
              people={people}
              canManage={canManage}
              onEdit={() => setEditing(d)}
            />
          ))}
        </div>
      )}

      {editing && (
        <DepartmentDialog
          dept={editing === "new" ? null : editing}
          people={people}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
