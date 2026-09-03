"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  FolderOpen,
  MessageSquare,
  Users,
  ArrowRight,
  Plus,
} from "lucide-react";
import api from "@/lib/api";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusPill, PROJECT_STATUS } from "@/components/ui/status-pill";
import { PageHeading } from "@/components/shared/ProjectSections";
import type { Organization, Project, CommentThread } from "@/lib/types";

interface AdminStats {
  clients?: number;
  projects?: number;
  open_requests?: number;
  total_users?: number;
}

export default function AdminOverview() {
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: () => api.get("/admin/stats").then((r) => r.data),
  });
  const { data: clients = [] } = useQuery<Organization[]>({
    queryKey: ["admin-clients"],
    queryFn: () => api.get("/organizations").then((r) => r.data),
  });
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["admin-projects"],
    queryFn: () => api.get("/projects").then((r) => r.data),
  });
  const { data: openComments = [] } = useQuery<CommentThread[]>({
    queryKey: ["comment-inbox", true],
    queryFn: () => api.get("/comments/inbox", { params: { only_open: true } }).then((r) => r.data),
  });

  return (
    <div>
      <PageHeading
        title="Overview"
        description="Clients, projects, and everything waiting on a reply from you."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard icon={Building2} label="Clients" value={stats?.clients ?? 0} loading={statsLoading} />
        <StatsCard icon={FolderOpen} label="Projects" value={stats?.projects ?? 0} loading={statsLoading} />
        <StatsCard
          icon={MessageSquare}
          label="Open requests"
          value={stats?.open_requests ?? 0}
          loading={statsLoading}
        />
        <StatsCard icon={Users} label="Users" value={stats?.total_users ?? 0} loading={statsLoading} />
      </div>

      {openComments.length > 0 && (
        <Link href="/admin/comments" className="mt-4 block">
          <Card interactive className="border-brand/30 bg-brand-wash">
            <CardContent className="flex items-center gap-4 pt-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/20 text-brand-soft">
                <MessageSquare size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-fg">
                  {openComments.length} client{" "}
                  {openComments.length === 1 ? "comment needs" : "comments need"} a reply
                </p>
                <p className="mt-0.5 truncate text-xs text-subtle">
                  Latest: &ldquo;{openComments[0].body.slice(0, 90)}&rdquo;
                </p>
              </div>
              <ArrowRight size={16} className="shrink-0 text-brand-soft" aria-hidden="true" />
            </CardContent>
          </Card>
        </Link>
      )}

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Panel
          title="Clients"
          href="/admin/clients"
          actionHref="/admin/clients"
          actionLabel="New client"
          empty="No clients yet."
        >
          {clients.slice(0, 5).map((c) => (
            <Link
              key={c.id}
              href={`/admin/clients/${c.id}`}
              className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-3 transition-colors last:border-0 hover:bg-white/[0.05]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-fg">{c.name}</p>
                <p className="mt-0.5 text-xs text-faint">{c.industry ?? "—"}</p>
              </div>
              <ArrowRight size={14} className="shrink-0 text-faint" aria-hidden="true" />
            </Link>
          ))}
        </Panel>

        <Panel
          title="Projects"
          href="/admin/projects"
          actionHref="/admin/projects/new"
          actionLabel="New project"
          empty="No projects yet."
        >
          {projects.slice(0, 5).map((p) => (
            <Link
              key={p.id}
              href={`/admin/projects/${p.id}`}
              className="flex items-center gap-4 border-b border-hairline px-5 py-3 transition-colors last:border-0 hover:bg-white/[0.05]"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">{p.name}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <StatusPill descriptor={PROJECT_STATUS[p.status]} size="sm" />
                </div>
              </div>
              <div className="w-20 shrink-0">
                <Progress value={p.completion_percentage} label={`${p.name} progress`} />
                <p className="tabular mt-1 text-right font-mono text-[10px] text-faint">
                  {p.completion_percentage}%
                </p>
              </div>
            </Link>
          ))}
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  title,
  href,
  actionHref,
  actionLabel,
  empty,
  children,
}: {
  title: string;
  href: string;
  actionHref: string;
  actionLabel: string;
  empty: string;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : !!children;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
        <h2 className="text-sm font-semibold tracking-tight text-fg">{title}</h2>
        <Link
          href={href}
          className="flex items-center gap-1 text-xs font-medium text-brand-soft transition-colors hover:text-fg"
        >
          View all
          <ArrowRight size={12} aria-hidden="true" />
        </Link>
      </div>

      {hasChildren ? (
        <div>{children}</div>
      ) : (
        <p className="px-5 py-8 text-center text-sm text-subtle">{empty}</p>
      )}

      <div className="border-t border-hairline px-5 py-3">
        <Link
          href={actionHref}
          className="flex items-center gap-1.5 text-xs font-medium text-subtle transition-colors hover:text-brand-soft"
        >
          <Plus size={13} aria-hidden="true" />
          {actionLabel}
        </Link>
      </div>
    </Card>
  );
}
