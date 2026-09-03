"use client";
import { FolderOpen } from "lucide-react";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeading } from "@/components/shared/ProjectSections";
import { useProjects } from "@/hooks/useProjects";

export default function ProjectsPage() {
  const { data: projects = [], isLoading } = useProjects();

  return (
    <div>
      <PageHeading
        title="Projects"
        description={
          isLoading
            ? "Loading your workspace…"
            : `${projects.length} ${projects.length === 1 ? "project" : "projects"} in your workspace.`
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass space-y-4 rounded-card p-5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-1.5 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <EmptyState
            icon={FolderOpen}
            title="No projects yet"
            description="Projects the Enigma-Cube team sets up for you will appear here, each with its own timeline, files and analytics."
          />
        </Card>
      ) : (
        <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}
