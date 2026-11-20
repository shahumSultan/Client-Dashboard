"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Building2, FolderOpen, Users, ArrowRight, Plus, Globe, ExternalLink, ArrowLeft, RotateCcw, UserMinus,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill, PROJECT_STATUS } from "@/components/ui/status-pill";
import { InvitePanel } from "@/components/admin/InvitePanel";
import { Select } from "@/components/ui/select";
import { useCurrentUser } from "@/hooks/useAuth";
import { useSetAccess, useSetRole } from "@/hooks/useAccounts";
import { errorDetail } from "@/hooks/useEngagements";
import type { Organization, Project, User, UserRole } from "@/lib/types";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  employee: "Employee",
  client_owner: "Owner",
  client_member: "Member",
};

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: org, isLoading } = useQuery<Organization>({
    queryKey: ["org", id],
    queryFn: () => api.get(`/organizations/${id}`).then((r) => r.data),
  });
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["admin-projects"],
    queryFn: () => api.get("/projects").then((r) => r.data),
    select: (data) => data.filter((p) => p.organization_id === id),
  });
  // Inactive included, so a member whose access was removed can be restored.
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["admin-users", "with-inactive"],
    queryFn: () => api.get("/admin/users", { params: { include_inactive: true } }).then((r) => r.data),
    select: (data) => data.filter((u) => u.organization_id === id),
  });
  const { data: me } = useCurrentUser();
  const setRole = useSetRole();
  const setAccess = useSetAccess();

  const changeAccess = (u: User, active: boolean) => {
    const name = u.full_name ?? u.email;
    if (
      !active &&
      !window.confirm(`Remove ${name}'s access to ${org?.name ?? "this workspace"}? You can restore it later.`)
    ) return;
    setAccess.mutate(
      { userId: u.id, active },
      {
        onSuccess: () => toast.success(active ? `${name}'s access restored` : `${name}'s access removed`),
        onError: (e) => toast.error(errorDetail(e, "Couldn't change their access")),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-card" />)}
      </div>
    );
  }

  if (!org) {
    return (
      <Card>
        <EmptyState
          icon={Building2}
          title="Client not found"
          description="This workspace may have been removed."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/clients"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-subtle transition-colors hover:text-fg"
      >
        <ArrowLeft size={13} aria-hidden="true" />
        All clients
      </Link>

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-wash text-brand-soft">
              <Building2 size={24} aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-xl font-normal tracking-tight text-fg-strong">{org.name}</h1>
              <p className="mt-1 font-mono text-[11px] text-subtle">
                {org.industry ?? "No industry"} · /{org.slug}
              </p>
            </div>
          </div>
          {org.website && (
            <a
              href={org.website}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-subtle transition-colors hover:text-brand-soft"
            >
              <Globe size={13} aria-hidden="true" />
              {org.website}
              <ExternalLink size={11} aria-hidden="true" />
            </a>
          )}
        </div>
        {org.description && (
          <p className="mt-5 text-sm leading-relaxed text-subtle">{org.description}</p>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4">
          <div className="flex items-center gap-2">
            <FolderOpen size={15} className="text-faint" aria-hidden="true" />
            <h2 className="text-sm font-sans font-semibold tracking-tight text-fg-strong">Projects</h2>
            <Badge>{projects.length}</Badge>
          </div>
          <Link href={`/admin/projects/new?org=${id}`}>
            <Button size="sm">
              <Plus size={13} aria-hidden="true" />
              New project
            </Button>
          </Link>
        </div>

        {projects.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-subtle">
            No projects for this client yet.
          </p>
        ) : (
          <ul>
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/projects/${p.id}`}
                  className="group flex items-center justify-between gap-4 border-b border-hairline px-5 py-3.5 transition-colors last:border-0 hover:bg-tint"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg">{p.name}</p>
                    <p className="mt-0.5 text-xs text-faint">
                      {p.project_type ?? "Project"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusPill descriptor={PROJECT_STATUS[p.status]} size="sm" />
                    <div className="hidden w-20 sm:block">
                      <Progress value={p.completion_percentage} label={`${p.name} progress`} />
                    </div>
                    <ArrowRight
                      size={14}
                      aria-hidden="true"
                      className="text-faint transition-colors group-hover:text-brand-soft"
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <InvitePanel organizationId={org.id} organizationName={org.name} />

      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-hairline px-5 py-4">
          <Users size={15} className="text-faint" aria-hidden="true" />
          <h2 className="text-sm font-sans font-semibold tracking-tight text-fg-strong">Members</h2>
          <Badge>{users.length}</Badge>
        </div>

        {users.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-subtle">
            Nobody has joined this workspace yet.
          </p>
        ) : (
          <ul>
            {users.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-3 last:border-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar size="sm" name={u.full_name} email={u.email} src={u.avatar_url} />
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate text-sm font-medium text-fg">
                      {u.full_name ?? "-"}
                      {!u.is_active && <Badge className="py-0 text-[10px]">No access</Badge>}
                    </p>
                    <p className="truncate text-xs text-faint">{u.email}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {u.is_active && me?.role === "admin" ? (
                    <Select
                      aria-label={`Role for ${u.full_name ?? u.email}`}
                      value={u.role}
                      disabled={setRole.isPending}
                      onChange={(e) => {
                        const role = e.target.value as UserRole;
                        setRole.mutate(
                          { userId: u.id, role },
                          {
                            onSuccess: () => toast.success(`${u.full_name ?? u.email} is now ${role === "client_owner" ? "an owner" : "a member"}`),
                            onError: (err) => toast.error(errorDetail(err, "Couldn't change their role")),
                          }
                        );
                      }}
                      className="h-9 w-28 text-xs"
                    >
                      <option value="client_owner">Owner</option>
                      <option value="client_member">Member</option>
                    </Select>
                  ) : (
                    <Badge>{ROLE_LABEL[u.role] ?? u.role}</Badge>
                  )}
                  {me?.role === "admin" && (
                    u.is_active ? (
                      <button
                        type="button"
                        onClick={() => changeAccess(u, false)}
                        aria-label={`Remove ${u.full_name ?? u.email}'s access`}
                        title="Remove access"
                        className="grid h-9 w-9 cursor-pointer place-items-center text-subtle hover:bg-danger-wash hover:text-danger"
                      >
                        <UserMinus size={14} aria-hidden="true" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => changeAccess(u, true)}
                        aria-label={`Restore ${u.full_name ?? u.email}'s access`}
                        title="Restore access"
                        className="grid h-9 w-9 cursor-pointer place-items-center text-subtle hover:bg-tint-strong hover:text-fg"
                      >
                        <RotateCcw size={14} aria-hidden="true" />
                      </button>
                    )
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
