"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Building2, FolderOpen, Users, ArrowRight, Plus, Globe, ExternalLink, ArrowLeft,
} from "lucide-react";
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
import type { Organization, Project, User } from "@/lib/types";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  staff: "Staff",
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
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["admin-users"],
    queryFn: () => api.get("/admin/users").then((r) => r.data),
    select: (data) => data.filter((u) => u.organization_id === id),
  });

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
              <h1 className="text-xl font-semibold tracking-tight text-fg">{org.name}</h1>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-faint">
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
            <h2 className="text-sm font-semibold tracking-tight text-fg">Projects</h2>
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
                  className="group flex items-center justify-between gap-4 border-b border-hairline px-5 py-3.5 transition-colors last:border-0 hover:bg-white/[0.05]"
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
          <h2 className="text-sm font-semibold tracking-tight text-fg">Members</h2>
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
                  <Avatar
                    size="sm"
                    name={u.full_name}
                    email={u.email}
                    src={u.avatar_url}
                    highlight={u.role === "admin"}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg">{u.full_name ?? "—"}</p>
                    <p className="truncate text-xs text-faint">{u.email}</p>
                  </div>
                </div>
                <Badge>{ROLE_LABEL[u.role] ?? u.role}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
