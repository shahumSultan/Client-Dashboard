"use client";
import { useState } from "react";
import { MessageSquare, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  StatusPill,
  REQUEST_STATUS,
  REQUEST_PRIORITY,
} from "@/components/ui/status-pill";
import { NewRequestDialog } from "@/components/projects/NewRequestDialog";
import { PageHeading, ProjectSections } from "@/components/shared/ProjectSections";
import { useRequests } from "@/hooks/useProjects";
import { timeAgo, STATUS_LABELS } from "@/lib/utils";
import type { Project } from "@/lib/types";

function ProjectRequests({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);
  const { data: requests = [], isLoading } = useRequests(project.id);

  if (isLoading) return <Skeleton className="h-32 w-full rounded-card" />;

  return (
    <>
      {requests.length === 0 ? (
        <Card>
          <EmptyState
            icon={MessageSquare}
            title="No requests for this project"
            description="Raise a feature request, report a bug, or ask for a change - the team replies here."
            action={
              <Button size="sm" onClick={() => setOpen(true)}>
                <Plus size={14} aria-hidden="true" />
                New request
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              <Plus size={14} aria-hidden="true" />
              New request
            </Button>
          </div>
          <ul className="stagger space-y-3">
            {requests.map((r) => (
              <li key={r.id}>
                <Card>
                  <CardContent className="pt-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-semibold text-fg">{r.title}</h4>
                          <Badge>{STATUS_LABELS[r.category]}</Badge>
                        </div>
                        <p className="mt-1.5 text-sm leading-relaxed text-subtle">
                          {r.description}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <StatusPill descriptor={REQUEST_STATUS[r.status]} size="sm" />
                        <StatusPill descriptor={REQUEST_PRIORITY[r.priority]} size="sm" />
                      </div>
                    </div>

                    {r.admin_response && (
                      <div className="mt-3 rounded-[10px] border border-brand/25 bg-brand-wash p-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-soft">
                          Response from Enigma-Cube
                        </p>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted">
                          {r.admin_response}
                        </p>
                      </div>
                    )}

                    <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-faint">
                      {timeAgo(r.created_at)}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      )}

      <NewRequestDialog projectId={project.id} open={open} onOpenChange={setOpen} />
    </>
  );
}

export default function RequestsPage() {
  return (
    <div>
      <PageHeading
        title="Requests"
        description="Everything you've asked for, and where each one stands."
      />
      <ProjectSections
        emptyIcon={MessageSquare}
        emptyTitle="No requests yet"
        emptyDescription="Once you have a project, you can raise requests here and track the team's response."
      >
        {(project) => <ProjectRequests project={project} />}
      </ProjectSections>
    </div>
  );
}
