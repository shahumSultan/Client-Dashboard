"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FolderOpen, Plus, ArrowRight } from "lucide-react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill, PROJECT_STATUS } from "@/components/ui/status-pill";
import type { Project, Organization } from "@/lib/types";

export default function AdminProjectsPage() {
  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["admin-projects"],
    queryFn: () => api.get("/projects").then((r) => r.data),
  });
  const { data: orgs = [] } = useQuery<Organization[]>({
    queryKey: ["admin-clients"],
    queryFn: () => api.get("/organizations").then((r) => r.data),
  });

  const orgName = Object.fromEntries(orgs.map((o) => [o.id, o.name]));

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-fg">Projects</h1>
          <p className="mt-1.5 text-sm text-subtle">
            {isLoading
              ? "Loading…"
              : `${projects.length} ${projects.length === 1 ? "project" : "projects"} across all clients.`}
          </p>
        </div>
        <Link href="/admin/projects/new">
          <Button>
            <Plus size={15} aria-hidden="true" />
            New project
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[68px] w-full rounded-card" />)}
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <EmptyState
            icon={FolderOpen}
            title="No projects yet"
            description="Create the first project for a client and it appears in their portal straight away."
            action={
              <Link href="/admin/projects/new">
                <Button>
                  <Plus size={14} aria-hidden="true" />
                  New project
                </Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul>
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/projects/${p.id}`}
                  className="group flex items-center justify-between gap-4 border-b border-hairline px-5 py-4 transition-colors last:border-0 hover:bg-white/[0.05]"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-wash text-brand-soft">
                      <FolderOpen size={17} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-fg">{p.name}</p>
                      <p className="mt-0.5 truncate text-xs text-faint">
                        {orgName[p.organization_id] ?? "Unknown client"}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-4">
                    <div className="hidden w-28 sm:block">
                      <Progress value={p.completion_percentage} label={`${p.name} progress`} />
                      <p className="tabular mt-1 text-right font-mono text-[10px] text-faint">
                        {p.completion_percentage}%
                      </p>
                    </div>
                    <StatusPill descriptor={PROJECT_STATUS[p.status]} size="sm" />
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
        </Card>
      )}
    </div>
  );
}
