import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { cn, formatDate, STATUS_LABELS, STATUS_COLORS } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Project } from "@/lib/types";

interface ProjectCardProps {
  project: Project;
}

const STATUS_ICON: Record<string, string> = {
  planning: "◐",
  development: "◑",
  testing: "◕",
  review: "◔",
  delivered: "●",
  on_hold: "○",
};

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 p-5 group">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 truncate group-hover:text-indigo-700 transition-colors">
            {project.name}
          </h3>
          {project.project_type && (
            <p className="text-xs text-slate-400 mt-0.5">{project.project_type}</p>
          )}
        </div>
        <Badge className={cn("shrink-0 text-[11px]", STATUS_COLORS[project.status])}>
          {STATUS_ICON[project.status]} {STATUS_LABELS[project.status]}
        </Badge>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-500 font-medium">Progress</span>
          <span className="text-xs font-bold text-slate-700">{project.completion_percentage}%</span>
        </div>
        <Progress value={project.completion_percentage} className="h-1.5" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {project.target_date ? (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Calendar size={12} />
            <span>Due {formatDate(project.target_date)}</span>
          </div>
        ) : (
          <div />
        )}
        <Link
          href={`/projects/${project.id}`}
          className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors group/link"
        >
          View
          <ArrowRight size={13} className="group-hover/link:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
