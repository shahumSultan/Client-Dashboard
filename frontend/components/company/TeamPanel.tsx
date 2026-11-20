"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Mail, Pencil, Phone, Plus, Trash2, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useDeleteTeamMember, useSaveTeamMember, useTeam } from "@/hooks/useCompany";
import { errorDetail } from "@/hooks/useEngagements";
import { useReadOnly } from "@/lib/read-only";
import { useCurrentUser } from "@/hooks/useAuth";
import { DepartmentChip } from "@/components/company/DepartmentChip";
import { TeamInvitePanel } from "@/components/company/TeamInvitePanel";
import type { TeamMember, TeamMemberInput } from "@/lib/types";

const BLANK: TeamMemberInput = {
  name: "", title: null, email: null, phone: null, user_id: null, notes: null,
  is_active: true, sort_order: 0,
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

function MemberDialog({ member, onClose }: { member: TeamMember | null; onClose: () => void }) {
  const save = useSaveTeamMember();
  const [form, setForm] = useState<TeamMemberInput>(() => {
    if (!member) return BLANK;
    const { id: _id, created_at: _c, departments: _d, ...rest } = member;
    void _id; void _c; void _d;
    return rest;
  });
  const set = <K extends keyof TeamMemberInput>(k: K, v: TeamMemberInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = () =>
    save.mutate(
      { id: member?.id, data: form },
      {
        onSuccess: () => {
          toast.success(member ? "Team member updated" : "Team member added");
          onClose();
        },
        onError: (e) => toast.error(errorDetail(e, "Couldn't save that person")),
      }
    );

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()} label="Team member">
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{member ? "Edit team member" : "Add team member"}</DialogTitle>
          <DialogClose onClick={onClose} />
        </DialogHeader>
        <div className="grid gap-5 px-6 pb-5 sm:grid-cols-2">
          <Field label="Name" htmlFor="tm-name" required>
            <Input id="tm-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Role" htmlFor="tm-title">
            <Input id="tm-title" value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} placeholder="Founder, Engineer…" />
          </Field>
          <Field label="Email" htmlFor="tm-email">
            <Input id="tm-email" type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Phone" htmlFor="tm-phone">
            <Input id="tm-phone" type="tel" value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes" htmlFor="tm-notes">
              <Textarea id="tm-notes" rows={2} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
            </Field>
          </div>
          <Field label="Sort order" htmlFor="tm-order" hint="Lower numbers list first.">
            <Input
              id="tm-order"
              type="number"
              value={form.sort_order}
              onChange={(e) => set("sort_order", Number(e.target.value) || 0)}
            />
          </Field>
          <label className="flex cursor-pointer items-center gap-2.5 self-center text-sm text-muted">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => set("is_active", e.target.checked)}
              className="h-4 w-4 accent-[var(--brand)]"
            />
            Currently with the company
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} allowReadOnly>Cancel</Button>
          <Button onClick={submit} loading={save.isPending} disabled={!form.name.trim()}>
            {member ? "Save" : "Add person"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TeamPanel() {
  const { data: team = [], isLoading } = useTeam();
  const remove = useDeleteTeamMember();
  const viewOnly = useReadOnly();
  const { data: me } = useCurrentUser();
  const [editing, setEditing] = useState<TeamMember | null | "new">(null);

  if (isLoading) return <Skeleton className="h-56 w-full" />;

  return (
    <div>
      {me?.role === "admin" && <TeamInvitePanel />}
      {!viewOnly && team.length > 0 && (
        <div className="mb-5 flex justify-end">
          <Button onClick={() => setEditing("new")}>
            <Plus size={15} aria-hidden="true" />
            Add person
          </Button>
        </div>
      )}

      {team.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="No one listed yet"
            description="Keep a directory of the people at Enigma-Cube - roles and how to reach them."
            action={
              !viewOnly ? (
                <Button onClick={() => setEditing("new")}>
                  <Plus size={14} aria-hidden="true" />
                  Add person
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-hairline">
            {team.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 sm:px-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center border border-hairline bg-base font-mono text-xs text-brand-soft">
                  {initials(m.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-medium text-fg">
                    {m.name}
                    {!m.is_active && <Badge className="py-0 text-[10px]">Former</Badge>}
                  </p>
                  <p className="truncate text-xs text-subtle">{m.title ?? "No role set"}</p>
                  {m.departments.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {m.departments.map((d) => <DepartmentChip key={d.id} name={d.name} colour={d.colour} />)}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                  {m.email && (
                    <a href={`mailto:${m.email}`} className="flex items-center gap-1.5 hover:text-fg">
                      <Mail size={12} aria-hidden="true" />
                      {m.email}
                    </a>
                  )}
                  {m.phone && (
                    <a href={`tel:${m.phone}`} className="flex items-center gap-1.5 hover:text-fg">
                      <Phone size={12} aria-hidden="true" />
                      {m.phone}
                    </a>
                  )}
                </div>
                {!viewOnly && (
                  <div className="-mr-2 ml-auto flex w-full justify-end sm:mr-0 sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setEditing(m)}
                      aria-label={`Edit ${m.name}`}
                      className="grid h-9 w-9 cursor-pointer place-items-center text-subtle hover:bg-tint-strong hover:text-fg"
                    >
                      <Pencil size={14} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!window.confirm(`Remove ${m.name} from the directory?`)) return;
                        remove.mutate(m.id, {
                          onSuccess: () => toast.success("Removed"),
                          onError: (e) => toast.error(errorDetail(e, "Couldn't remove that person")),
                        });
                      }}
                      aria-label={`Remove ${m.name}`}
                      className="grid h-9 w-9 cursor-pointer place-items-center text-subtle hover:bg-tint-strong hover:text-danger"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {editing && <MemberDialog member={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
