"use client";
import { Paperclip, FileText, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CommentsDisclosure } from "@/components/comments/CommentsDisclosure";
import { PageHeading, ProjectSections } from "@/components/shared/ProjectSections";
import { useFiles } from "@/hooks/useProjects";
import { formatBytes, timeAgo } from "@/lib/utils";
import type { Project } from "@/lib/types";

function ProjectFiles({ project }: { project: Project }) {
  const { data: files = [], isLoading } = useFiles(project.id);

  if (isLoading) return <Skeleton className="h-28 w-full rounded-card" />;

  if (files.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Paperclip}
          title="No files for this project"
          description="Deliverables and shared documents will show up here as the team publishes them."
        />
      </Card>
    );
  }

  return (
    <ul className="stagger space-y-3">
      {files.map((f) => (
        <li key={f.id}>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-subtle">
                  <FileText size={17} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg">{f.name}</p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-faint">
                    {formatBytes(f.size_bytes)} · {timeAgo(f.created_at)}
                  </p>
                </div>
                {f.is_deliverable && (
                  <Badge className="border-success/25 bg-success-wash text-success">
                    Deliverable
                  </Badge>
                )}
                {f.public_url && (
                  <a
                    href={f.public_url}
                    download
                    aria-label={`Download ${f.name}`}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] text-subtle transition-colors hover:bg-white/[0.08] hover:text-fg"
                  >
                    <Download size={15} aria-hidden="true" />
                  </a>
                )}
              </div>
              <CommentsDisclosure
                projectId={project.id}
                targetType="file"
                targetId={f.id}
                label="Comment on this file"
                emptyHint="Revision notes or feedback on this deliverable."
              />
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}

export default function FilesPage() {
  return (
    <div>
      <PageHeading
        title="Files"
        description="Deliverables and documents shared with you by Enigma-Cube."
      />
      <ProjectSections
        emptyIcon={Paperclip}
        emptyTitle="No files yet"
        emptyDescription="Deliverables will appear here once the team starts publishing them to your projects."
      >
        {(project) => <ProjectFiles project={project} />}
      </ProjectSections>
    </div>
  );
}
