"use client";
import { useState } from "react";
import { toast } from "sonner";
import { UserPlus, Copy, Check, X, Clock, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useInvitations,
  useCreateInvitation,
  useRevokeInvitation,
  inviteUrl,
} from "@/hooks/useInvitations";
import { formatDate } from "@/lib/utils";
import { useReadOnly } from "@/lib/read-only";
import type { UserRole } from "@/lib/types";

const ROLE_LABEL: Record<string, string> = {
  client_owner: "Owner",
  client_member: "Member",
};

export function InvitePanel({
  organizationId,
  organizationName,
}: {
  organizationId: string;
  organizationName: string;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("client_member");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const viewOnly = useReadOnly();

  const { data: invitations = [], isLoading } = useInvitations(organizationId);
  const create = useCreateInvitation(organizationId);
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
          ? "We emailed them the invitation. They join automatically when they sign up with that address."
          : "Email isn't configured, so send them the link yourself.",
        action: { label: "Copy link", onClick: () => copy(invite.token) },
      });
    } catch {
      toast.error("Couldn't create that invitation");
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-hairline px-5 py-4">
        <UserPlus size={15} className="text-faint" aria-hidden="true" />
        <h2 className="text-sm font-semibold tracking-tight text-fg">Invitations</h2>
        {invitations.length > 0 && <Badge>{invitations.length} pending</Badge>}
      </div>

      <form onSubmit={submit} noValidate className="space-y-4 border-b border-hairline px-5 py-5">
        <p className="text-sm leading-relaxed text-subtle">
          Access is invite-only. Whoever you invite joins{" "}
          <span className="text-fg">{organizationName}</span> the moment they sign
          up with that address - the emailed link is a convenience, not a
          requirement.
        </p>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <Field label="Email address" htmlFor="invite-email" error={error}>
            <Input
              id="invite-email"
              type="email"
              inputMode="email"
              autoComplete="off"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              aria-invalid={!!error}
              placeholder="dana@acme.com"
            />
          </Field>

          <Field label="Role" htmlFor="invite-role">
            <Select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="sm:w-40"
            >
              <option value="client_member">Member</option>
              <option value="client_owner">Owner</option>
            </Select>
          </Field>

          <Button type="submit" loading={create.isPending} className="sm:mb-0">
            {!create.isPending && <Mail size={14} aria-hidden="true" />}
            Invite
          </Button>
        </div>
      </form>

      {isLoading ? (
        <div className="px-5 py-4">
          <Skeleton className="h-12 w-full" />
        </div>
      ) : invitations.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-subtle">
          No invitations outstanding.
        </p>
      ) : (
        <ul>
          {invitations.map((invite) => (
            <li
              key={invite.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-3.5 last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-fg">{invite.email}</p>
                <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-faint">
                  <Clock size={10} aria-hidden="true" />
                  Expires {formatDate(invite.expires_at)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Badge>{ROLE_LABEL[invite.role] ?? invite.role}</Badge>
                <Button variant="ghost" size="sm" allowReadOnly onClick={() => copy(invite.token)}>
                  {copied === invite.token ? (
                    <>
                      <Check size={13} aria-hidden="true" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={13} aria-hidden="true" />
                      Copy link
                    </>
                  )}
                </Button>
                {!viewOnly && (
                <button
                  onClick={() => {
                    revoke.mutate(invite.id, {
                      onSuccess: () => toast.success("Invitation revoked"),
                      onError: () => toast.error("Couldn't revoke that invitation"),
                    });
                  }}
                  aria-label={`Revoke invitation for ${invite.email}`}
                  className="grid h-9 w-9 place-items-center rounded-[10px] text-faint transition-colors hover:bg-danger-wash hover:text-danger cursor-pointer"
                >
                  <X size={14} aria-hidden="true" />
                </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
