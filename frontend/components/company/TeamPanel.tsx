"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Clock, Mail, Pencil, Phone, Plus, RotateCcw, Trash2, UserMinus, UserPlus, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useDeleteTeamMember, useSaveTeamMember, useTeam } from "@/hooks/useCompany";
import { useSetAccess, useSetRole, useWaitingUsers } from "@/hooks/useAccounts";
import { errorDetail } from "@/hooks/useEngagements";
import { useReadOnly } from "@/lib/read-only";
import { useCurrentUser } from "@/hooks/useAuth";
import { DepartmentChip } from "@/components/company/DepartmentChip";
import { TeamInvitePanel } from "@/components/company/TeamInvitePanel";
import { timeAgo } from "@/lib/utils";
import type { TeamMember, TeamMemberInput, UserRole } from "@/lib/types";

const BLANK: TeamMemberInput = {
  name: "", title: null, email: null, phone: null, user_id: null, notes: null,
  is_active: true, sort_order: 0,
};

const ROLE_LABEL: Partial<Record<UserRole, string>> = { admin: "Admin", employee: "Employee" };

function MemberDialog({ member, onClose }: { member: TeamMember | null; onClose: () => void }) {
  const save = useSaveTeamMember();
  const [form, setForm] = useState<TeamMemberInput>(() => {
    if (!member) return BLANK;
    const { id: _id, created_at: _c, departments: _d, account: _a, ...rest } = member;
    void _id; void _c; void _d; void _a;
    return rest;
  });
  const set = <K extends keyof TeamMemberInput>(k: K, v: TeamMemberInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  // For someone with a login, "still here" follows their access, not this form.
  const hasLogin = !!member?.account;

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
          <DialogTitle>{member ? "Edit team member" : "Add to the directory"}</DialogTitle>
          <DialogClose onClick={onClose} />
        </DialogHeader>
        <div className="grid gap-5 px-6 pb-5 sm:grid-cols-2">
          {!member && (
            <p className="text-xs leading-relaxed text-subtle sm:col-span-2">
              For someone without a portal login - an adviser, a contractor. To give someone access,
              use <span className="text-fg">Invite to the team</span> above instead.
            </p>
          )}
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
          {hasLogin ? (
            <p className="self-center text-xs leading-relaxed text-subtle">
              Has a portal login - use <span className="text-fg">Remove access</span> when they leave.
            </p>
          ) : (
            <label className="flex cursor-pointer items-center gap-2.5 self-center text-sm text-muted">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => set("is_active", e.target.checked)}
                className="h-4 w-4 accent-[var(--brand)]"
              />
              Currently with the company
            </label>
          )}
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

/** People who signed up without an invitation. Admin-only. */
function WaitingList() {
  const { data: waiting = [] } = useWaitingUsers();
  const setRole = useSetRole();
  if (waiting.length === 0) return null;

  return (
    <Card className="mb-5 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-hairline px-5 py-4">
        <Clock size={15} className="text-faint" aria-hidden="true" />
        <h2 className="text-sm font-semibold tracking-tight text-fg-strong">Signed up, waiting for access</h2>
        <Badge>{waiting.length}</Badge>
      </div>
      <p className="border-b border-hairline px-5 py-3 text-xs leading-relaxed text-subtle">
        They created an account without an invitation. Add a colleague to the team here; to let a
        client in, invite their address from that client&apos;s page.
      </p>
      <ul className="divide-y divide-hairline">
        {waiting.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <Avatar name={u.full_name} email={u.email} src={u.avatar_url} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-fg">{u.full_name ?? u.email}</p>
              <p className="truncate text-xs text-subtle">
                {u.email} · signed up {timeAgo(u.created_at)}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              loading={setRole.isPending && setRole.variables?.userId === u.id}
              onClick={() =>
                setRole.mutate(
                  { userId: u.id, role: "employee" },
                  {
                    onSuccess: () => toast.success(`${u.full_name ?? u.email} added to the team as an employee`),
                    onError: (e) => toast.error(errorDetail(e, "Couldn't add them")),
                  }
                )
              }
            >
              <UserPlus size={13} aria-hidden="true" />
              Add to team
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function MemberRow({
  m, isAdmin, isMe, onEdit,
}: { m: TeamMember; isAdmin: boolean; isMe: boolean; onEdit: () => void }) {
  const remove = useDeleteTeamMember();
  const setRole = useSetRole();
  const setAccess = useSetAccess();
  const account = m.account;
  const hasAccess = !!account?.is_active && !!ROLE_LABEL[account.role];

  const changeAccess = (active: boolean) => {
    if (!m.user_id) return;
    if (
      !active &&
      !window.confirm(
        `Remove ${m.name}'s access? They're signed out of the portal and taken out of their departments. ` +
          "Nothing they made is deleted, and you can restore access later."
      )
    ) return;
    setAccess.mutate(
      { userId: m.user_id, active },
      {
        onSuccess: () => toast.success(active ? `${m.name}'s access restored` : `${m.name}'s access removed`),
        onError: (e) => toast.error(errorDetail(e, "Couldn't change their access")),
      }
    );
  };

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 sm:px-5">
      <Avatar name={m.name} email={m.email} src={account?.avatar_url} highlight={account?.role === "admin" && hasAccess} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate text-sm font-medium text-fg">
          {m.name}
          {isMe && <Badge variant="brand" className="py-0 text-[10px]">You</Badge>}
          {!m.is_active && <Badge className="py-0 text-[10px]">Former</Badge>}
          {!account && m.is_active && <Badge className="py-0 text-[10px]">No login</Badge>}
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

      <div className="-mr-2 ml-auto flex w-full flex-wrap items-center justify-end gap-1 sm:mr-0 sm:w-auto">
        {hasAccess && account && (
          isAdmin && !isMe ? (
            <Select
              aria-label={`Access level for ${m.name}`}
              value={account.role}
              disabled={setRole.isPending}
              onChange={(e) => {
                // Read now: the select is controlled, so React puts the old
                // value back until the refetch lands.
                const role = e.target.value as UserRole;
                setRole.mutate(
                  { userId: m.user_id!, role },
                  {
                    onSuccess: () => toast.success(`${m.name} is now ${role === "admin" ? "an admin" : "an employee"}`),
                    onError: (err) => toast.error(errorDetail(err, "Couldn't change their role")),
                  }
                );
              }}
              className="h-9 w-32 text-xs"
            >
              <option value="admin">Admin</option>
              <option value="employee">Employee</option>
            </Select>
          ) : (
            <Badge>{ROLE_LABEL[account.role]}</Badge>
          )
        )}
        {isAdmin && (
          <>
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Edit ${m.name}`}
              className="grid h-9 w-9 cursor-pointer place-items-center text-subtle hover:bg-tint-strong hover:text-fg"
            >
              <Pencil size={14} aria-hidden="true" />
            </button>
            {account && !isMe && (
              hasAccess ? (
                <button
                  type="button"
                  onClick={() => changeAccess(false)}
                  aria-label={`Remove ${m.name}'s access`}
                  title="Remove access"
                  className="grid h-9 w-9 cursor-pointer place-items-center text-subtle hover:bg-danger-wash hover:text-danger"
                >
                  <UserMinus size={14} aria-hidden="true" />
                </button>
              ) : !account.is_active ? (
                <button
                  type="button"
                  onClick={() => changeAccess(true)}
                  aria-label={`Restore ${m.name}'s access`}
                  title="Restore access"
                  className="grid h-9 w-9 cursor-pointer place-items-center text-subtle hover:bg-tint-strong hover:text-fg"
                >
                  <RotateCcw size={14} aria-hidden="true" />
                </button>
              ) : null
            )}
            {!hasAccess && !isMe && (
              <button
                type="button"
                onClick={() => {
                  if (!window.confirm(`Remove ${m.name} from the directory?`)) return;
                  remove.mutate(m.id, {
                    onSuccess: () => toast.success("Removed"),
                    onError: (e) => toast.error(errorDetail(e, "Couldn't remove that person")),
                  });
                }}
                aria-label={`Remove ${m.name} from the directory`}
                className="grid h-9 w-9 cursor-pointer place-items-center text-subtle hover:bg-tint-strong hover:text-danger"
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            )}
          </>
        )}
      </div>
    </li>
  );
}

export function TeamPanel() {
  const { data: team = [], isLoading } = useTeam();
  const viewOnly = useReadOnly();
  const { data: me } = useCurrentUser();
  const isAdmin = me?.role === "admin";
  const [editing, setEditing] = useState<TeamMember | null | "new">(null);

  if (isLoading) return <Skeleton className="h-56 w-full" />;

  return (
    <div>
      {isAdmin && <TeamInvitePanel />}
      {isAdmin && <WaitingList />}

      {!viewOnly && team.length > 0 && (
        <div className="mb-5 flex justify-end">
          <Button variant="ghost" onClick={() => setEditing("new")}>
            <Plus size={15} aria-hidden="true" />
            Add someone without a login
          </Button>
        </div>
      )}

      {team.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="No one listed yet"
            description="Invite people above, or keep a directory entry for someone without a login."
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
              <MemberRow
                key={m.id}
                m={m}
                isAdmin={isAdmin}
                isMe={!!me && m.user_id === me.id}
                onEdit={() => setEditing(m)}
              />
            ))}
          </ul>
        </Card>
      )}

      {editing && <MemberDialog member={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
