"use client";
import { use, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  Rocket,
  Plus,
  MessageSquare,
  FileText,
  Download,
  Megaphone,
  ArrowLeft,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  StatusPill,
  PROJECT_STATUS,
  REQUEST_STATUS,
  REQUEST_PRIORITY,
} from "@/components/ui/status-pill";
import { MilestoneTimeline } from "@/components/projects/MilestoneTimeline";
import { ProjectAnalytics } from "@/components/projects/ProjectAnalytics";
import { NewRequestDialog } from "@/components/projects/NewRequestDialog";
import { CommentsPanel } from "@/components/comments/CommentsPanel";
import { CommentsDisclosure } from "@/components/comments/CommentsDisclosure";
import {
  useProject,
  useProjectUpdates,
  useMilestones,
  useRequests,
  useFiles,
} from "@/hooks/useProjects";
import { formatDate, timeAgo, formatBytes, STATUS_LABELS } from "@/lib/utils";
import { useEngagements } from "@/hooks/useEngagements";
import { ProjectGate } from "@/components/onboarding/OnboardingBanner";
import type { ClientRequest } from "@/lib/types";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [requestOpen, setRequestOpen] = useState(false);

  const { data: project, isLoading } = useProject(id);
  const { data: updates = [] } = useProjectUpdates(id);
  const { data: milestones = [] } = useMilestones(id);
  const { data: requests = [] } = useRequests(id);
  const { data: files = [] } = useFiles(id);
  const { data: engagements = [] } = useEngagements(id);
  const unsigned = engagements.find((e) => e.stage === "awaiting_signature");

  if (isLoading) {
    return (
      <div className="space-y-5" aria-busy="true">
        <Skeleton className="h-40 w-full rounded-card-lg" />
        <Skeleton className="h-11 w-96 rounded-full" />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    );
  }

  if (!project) {
    return (
      <Card>
        <EmptyState
          icon={FileText}
          title="Project not found"
          description="This project may have been removed, or it belongs to another workspace."
          action={
            <Link
              href="/projects"
              className="glass inline-flex h-10 items-center gap-2 rounded-[10px] px-4 text-sm font-medium text-fg transition-colors hover:bg-glass-strong"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              Back to projects
            </Link>
          }
        />
      </Card>
    );
  }

  if (unsigned) {
    return (
      <div className="space-y-6">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-subtle transition-colors hover:text-fg"
        >
          <ArrowLeft size={13} aria-hidden="true" />
          All projects
        </Link>
        <ProjectGate engagement={unsigned} />
      </div>
    );
  }

  const openRequests = requests.filter(
    (r) => r.status === "pending" || r.status === "in_progress"
  ).length;

  return (
    <div className="space-y-6">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-subtle transition-colors hover:text-fg"
      >
        <ArrowLeft size={13} aria-hidden="true" />
        All projects
      </Link>

      <section className="glass glass-sheen relative overflow-hidden rounded-card-lg p-6 sm:p-7">
        <div
          className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-brand/20 blur-[100px]"
          aria-hidden="true"
        />
        <div className="relative">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-fg sm:text-2xl">
                {project.name}
              </h1>
              {project.description && (
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-subtle">
                  {project.description}
                </p>
              )}
            </div>
            <StatusPill descriptor={PROJECT_STATUS[project.status]} />
          </div>

          <div className="mb-5">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-xs font-medium text-subtle">Overall progress</span>
              <span className="tabular text-sm font-semibold text-fg">
                {project.completion_percentage}%
              </span>
            </div>
            <Progress
              value={project.completion_percentage}
              label={`${project.name} overall progress`}
              className="h-2"
            />
          </div>

          <dl className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
            {project.start_date && (
              <Fact icon={CalendarDays} label="Started" value={formatDate(project.start_date)} />
            )}
            {project.target_date && (
              <Fact icon={Clock} label="Target" value={formatDate(project.target_date)} />
            )}
            {project.delivered_date && (
              <Fact
                icon={Rocket}
                label="Delivered"
                value={formatDate(project.delivered_date)}
                tone="text-success"
              />
            )}
          </dl>
        </div>
      </section>

      <Tabs defaultValue="timeline">
        <div className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          <TabsList>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="updates">Updates ({updates.length})</TabsTrigger>
            <TabsTrigger value="discussion">Discussion</TabsTrigger>
            <TabsTrigger value="requests">Requests ({requests.length})</TabsTrigger>
            <TabsTrigger value="files">Files ({files.length})</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="timeline">
          <MilestoneTimeline milestones={milestones} projectId={id} />
        </TabsContent>

        <TabsContent value="updates">
          {updates.length === 0 ? (
            <Card>
              <EmptyState
                icon={Megaphone}
                title="No updates yet"
                description="Progress notes from the Enigma-Cube team will land here as work moves along."
              />
            </Card>
          ) : (
            <ul className="stagger space-y-3">
              {updates.map((u) => (
                <li key={u.id}>
                  <Card>
                    <CardContent className="pt-5">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
                        {u.content}
                      </p>
                      <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-faint">
                        {timeAgo(u.created_at)}
                      </p>
                      <CommentsDisclosure
                        projectId={id}
                        targetType="update"
                        targetId={u.id}
                        label="Comment on this update"
                      />
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="discussion">
          <Card>
            <CardContent className="pt-6">
              <CommentsPanel
                projectId={id}
                targetType="project"
                title="Project discussion"
                emptyHint="Anything that doesn't belong to a specific milestone or file - questions, ideas, or things you'd like added."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-subtle">
                {openRequests === 0
                  ? "Nothing outstanding."
                  : `${openRequests} open ${openRequests === 1 ? "request" : "requests"}`}
              </p>
              <Button size="sm" onClick={() => setRequestOpen(true)}>
                <Plus size={14} aria-hidden="true" />
                New request
              </Button>
            </div>

            {requests.length === 0 ? (
              <Card>
                <EmptyState
                  icon={MessageSquare}
                  title="No requests yet"
                  description="Raise a feature request, report a bug, or ask for a change - the team will respond here."
                  action={
                    <Button size="sm" onClick={() => setRequestOpen(true)}>
                      <Plus size={14} aria-hidden="true" />
                      New request
                    </Button>
                  }
                />
              </Card>
            ) : (
              <ul className="stagger space-y-3">
                {requests.map((r) => (
                  <li key={r.id}>
                    <RequestRow request={r} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <NewRequestDialog
            projectId={id}
            open={requestOpen}
            onOpenChange={setRequestOpen}
          />
        </TabsContent>

        <TabsContent value="files">
          {files.length === 0 ? (
            <Card>
              <EmptyState
                icon={FileText}
                title="No files yet"
                description="Deliverables and shared documents will appear here as the team publishes them."
              />
            </Card>
          ) : (
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
                        projectId={id}
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
          )}
        </TabsContent>

        <TabsContent value="analytics">
          <ProjectAnalytics projectId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
  tone = "text-muted",
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={13} className="text-faint" />
      <dt className="text-faint">{label}</dt>
      <dd className={tone}>{value}</dd>
    </div>
  );
}

function RequestRow({ request }: { request: ClientRequest }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-semibold text-fg">{request.title}</h4>
              <Badge>{STATUS_LABELS[request.category]}</Badge>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-subtle">
              {request.description}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <StatusPill descriptor={REQUEST_STATUS[request.status]} size="sm" />
            <StatusPill descriptor={REQUEST_PRIORITY[request.priority]} size="sm" />
          </div>
        </div>

        {request.admin_response && (
          <div className="mt-3 rounded-[10px] border border-brand/25 bg-brand-wash p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-soft">
              Response from Enigma-Cube
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              {request.admin_response}
            </p>
          </div>
        )}

        <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-faint">
          {timeAgo(request.created_at)}
        </p>
      </CardContent>
    </Card>
  );
}
