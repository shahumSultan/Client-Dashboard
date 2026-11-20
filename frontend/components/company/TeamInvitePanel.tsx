"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Clock, Copy, Mail, UserPlus, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import {
  inviteUrl, useCreateTeamInvitation, useRevokeInvitation, useTeamInvitations,
} from "@/hooks/useInvitations";
import { errorDetail } from "@/hooks/useEngagements";
import { formatDate } from "@/lib/utils";

type TeamRole = "admin" | "employee";

const ROLE_LABEL: Record<TeamRole, string> = { admin: "Admin", employee: "Employee" };

/**
 * Invite someone onto the Enigma-Cube team. Admin-only: render it only for
 * admins (the API refuses everyone else).
 */
export function TeamInvitePanel() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("employee");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const { data: invitations = [] } = useTeamInvitations();
  const create = useCreateTeamInvitation();
  const revoke = useRevokeInvitation();

  async function copy(token: string) {
    const url = inviteUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(token);
      setTimeout(() => setCopied(null), 2000);
      toast.success("Invite link copied");
    } catch {
      // Clipboard is blocked outside a secure context - show it instead.
      toast.info("Copy this link", { description: url, duration: 12000 });
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
      setError("Enter the email address they'll sign up with.");
      return;
    }
    try {
      const invite = await create.mutateAsync({ email: value, role });
      setEmail("");
      setError(null);
      toast.success(`${value} invited`, {
        description: invite.email_sent
          ? "We emailed them. They join the team when they sign up with that address."
          : "Email isn't configured, so send them the link yourself.",
        action: { label: "Copy link", onClick: () => copy(invite.token) },
      });
    } catch (err) {
      setError(errorDetail(err, "Couldn't create that invitation"));
    }
  }

  return (
    <Card className="mb-5 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-hairline px-5 py-4">
        <UserPlus size={15} className="text-faint" aria-hidden="true" />
        <h2 className="text-sm font-semibold tracking-tight text-fg-strong">Invite to the team</h2>
        {invitations.length > 0 && <Badge>{invitations.length} pending</Badge>}
      </div>

      <form onSubmit={submit} noValidate className="px-5 py-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <Field label="Email address" htmlFor="team-invite-email" error={error}>
            <Input
              id="team-invite-email"
              type="email"
              inputMode="email"
              autoComplete="off"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              aria-invalid={!!error}
              placeholder="name@enigma-cube.com"
            />
          </Field>
          <Field label="Role" htmlFor="team-invite-role">
            <Select
              id="team-invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as TeamRole)}
              className="sm:w-40"
            >
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </Select>
          </Field>
          <Button type="submit" loading={create.isPending}>
            {!create.isPending && <Mail size={14} aria-hidden="true" />}
            Invite
          </Button>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-subtle">
          Employees see the team, departments and policy and brand documents - never clients or bank
          accounts. Admins see and change everything.
        </p>
      </form>

      {invitations.length > 0 && (
        <ul className="border-t border-hairline">
          {invitations.map((invite) => (
            <li
              key={invite.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-3.5 last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-fg">{invite.email}</p>
                <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-subtle">
                  <Clock size={10} aria-hidden="true" />
                  Expires {formatDate(invite.expires_at)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge>{ROLE_LABEL[invite.role as TeamRole] ?? invite.role}</Badge>
                <Button variant="ghost" size="sm" onClick={() => copy(invite.token)}>
                  {copied === invite.token ? (
                    <><Check size={13} aria-hidden="true" />Copied</>
                  ) : (
                    <><Copy size={13} aria-hidden="true" />Copy link</>
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() =>
                    revoke.mutate(invite.id, {
                      onSuccess: () => toast.success("Invitation revoked"),
                      onError: (e) => toast.error(errorDetail(e, "Couldn't revoke that invitation")),
                    })
                  }
                  aria-label={`Revoke invitation for ${invite.email}`}
                  className="grid h-9 w-9 cursor-pointer place-items-center text-faint transition-colors hover:bg-danger-wash hover:text-danger"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
