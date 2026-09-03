"use client";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ArrowRight, FolderOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { StatusPill, PROJECT_STATUS } from "@/components/ui/status-pill";
import { useProjects } from "@/hooks/useProjects";
import type { Project } from "@/lib/types";

interface ProjectSectionsProps {
  /** Rendered once per project — owns its own data fetching. */
  children: (project: Project) => React.ReactNode;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
}

/**
 * The cross-project pages (milestones, files, requests, analytics) are all the
 * same shape: one section per project, each fetching its own slice. Keeping
 * that in one place means every page gets the same header, empty state and
 * loading behaviour.
 */
export function ProjectSections({
  children,
  emptyIcon,
  emptyTitle,
  emptyDescription,
}: ProjectSectionsProps) {
  const { data: projects = [], isLoading } = useProjects();

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-48 w-full rounded-card" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-10">
      {projects.map((project) => (
        <section key={project.id} aria-label={project.name}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold tracking-tight text-fg">
                {project.name}
              </h2>
              <StatusPill descriptor={PROJECT_STATUS[project.status]} size="sm" />
            </div>
            <Link
              href={`/projects/${project.id}`}
              className="flex items-center gap-1.5 text-xs font-medium text-brand-soft transition-colors hover:text-fg"
            >
              Open project
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>
          {children(project)}
        </section>
      ))}
    </div>
  );
}

export function PageHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="mb-7">
      <h1 className="text-xl font-semibold tracking-tight text-fg">{title}</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-subtle">{description}</p>
    </header>
  );
}

export { FolderOpen };
