"use client";
import { BarChart3 } from "lucide-react";
import { ProjectAnalytics } from "@/components/projects/ProjectAnalytics";
import { PageHeading, ProjectSections } from "@/components/shared/ProjectSections";

export default function AnalyticsPage() {
  return (
    <div>
      <PageHeading
        title="Analytics"
        description="Business impact and performance across your projects."
      />
      <ProjectSections
        emptyIcon={BarChart3}
        emptyTitle="No analytics yet"
        emptyDescription="Once your projects start producing results, performance figures and trends will appear here."
      >
        {(project) => <ProjectAnalytics projectId={project.id} />}
      </ProjectSections>
    </div>
  );
}
