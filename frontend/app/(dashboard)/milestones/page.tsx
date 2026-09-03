"use client";
import { CheckSquare } from "lucide-react";
import { MilestoneTimeline } from "@/components/projects/MilestoneTimeline";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeading, ProjectSections } from "@/components/shared/ProjectSections";
import { useMilestones } from "@/hooks/useProjects";
import type { Project } from "@/lib/types";

function ProjectMilestones({ project }: { project: Project }) {
  const { data: milestones = [], isLoading } = useMilestones(project.id);

  if (isLoading) return <Skeleton className="h-40 w-full rounded-card" />;

  return <MilestoneTimeline milestones={milestones} projectId={project.id} />;
}

export default function MilestonesPage() {
  return (
    <div>
      <PageHeading
        title="Milestones"
        description="Every phase across your projects — what's finished, what's underway, and what's still ahead."
      />
      <ProjectSections
        emptyIcon={CheckSquare}
        emptyTitle="No milestones yet"
        emptyDescription="Once a project is set up, its phases will appear here as a timeline you can follow and comment on."
      >
        {(project) => <ProjectMilestones project={project} />}
      </ProjectSections>
    </div>
  );
}
