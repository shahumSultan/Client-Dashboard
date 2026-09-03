import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { StatusPill, PROJECT_STATUS } from "@/components/ui/status-pill";
import type { Project } from "@/lib/types";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="glass glass-sheen glass-hover group block rounded-card p-5"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold tracking-tight text-fg">
            {project.name}
          </h3>
          {project.project_type && (
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-faint">
              {project.project_type}
            </p>
          )}
        </div>
        <StatusPill descriptor={PROJECT_STATUS[project.status]} size="sm" />
      </div>

      <div className="mb-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-xs font-medium text-subtle">Progress</span>
          <span className="tabular text-xs font-semibold text-fg">
            {project.completion_percentage}%
          </span>
        </div>
        <Progress
          value={project.completion_percentage}
          label={`${project.name} progress`}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        {project.target_date ? (
          <span className="flex items-center gap-1.5 text-xs text-faint">
            <CalendarDays size={12} aria-hidden="true" />
            Due {formatDate(project.target_date)}
          </span>
        ) : (
          <span />
        )}
        <span className="flex items-center gap-1.5 text-xs font-semibold text-brand-soft">
          View
          <ArrowRight
            size={13}
            aria-hidden="true"
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </span>
      </div>
    </Link>
  );
}
