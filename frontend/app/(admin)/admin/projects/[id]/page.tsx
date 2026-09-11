"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Send, Megaphone } from "lucide-react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  StatusPill,
  PROJECT_STATUS,
  MILESTONE_STATUS,
} from "@/components/ui/status-pill";
import { CommentsPanel } from "@/components/comments/CommentsPanel";
import { OnboardingCard } from "@/components/admin/OnboardingCard";
import { formatDate, timeAgo, STATUS_LABELS } from "@/lib/utils";
import type {
  Project,
  Milestone,
  ProjectUpdate,
  Organization,
  ProjectStatus,
  MilestoneStatus,
} from "@/lib/types";

const STATUSES: ProjectStatus[] = [
  "planning",
  "development",
  "testing",
  "review",
  "delivered",
  "on_hold",
];
const MILESTONE_STATUSES: MilestoneStatus[] = [
  "upcoming",
  "in_progress",
  "completed",
  "delayed",
];

export default function AdminProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [updateText, setUpdateText] = useState("");
  const [newMilestone, setNewMilestone] = useState({
    title: "",
    due_date: "",
    status: "upcoming",
  });
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ["project", id],
    queryFn: () => api.get(`/projects/${id}`).then((r) => r.data),
  });
  const { data: milestones = [] } = useQuery<Milestone[]>({
    queryKey: ["milestones", id],
    queryFn: () => api.get(`/milestones/project/${id}`).then((r) => r.data),
  });
  const { data: updates = [] } = useQuery<ProjectUpdate[]>({
    queryKey: ["project-updates", id],
    queryFn: () => api.get(`/projects/${id}/updates`).then((r) => r.data),
  });
  const { data: orgs = [] } = useQuery<Organization[]>({
    queryKey: ["admin-clients"],
    queryFn: () => api.get("/organizations").then((r) => r.data),
  });

  const orgName = orgs.find((o) => o.id === project?.organization_id)?.name;

  const patchProject = useMutation({
    mutationFn: (data: Partial<Project>) =>
      api.patch(`/projects/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", id] });
      qc.invalidateQueries({ queryKey: ["admin-projects"] });
    },
    onError: () => toast.error("Couldn't update the project"),
  });

  const createMilestone = useMutation({
    mutationFn: (data: typeof newMilestone) =>
      api
        .post("/milestones", {
          project_id: id,
          title: data.title.trim(),
          status: data.status,
          due_date: data.due_date || null,
          order_index: milestones.length,
        })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["milestones", id] });
      setNewMilestone({ title: "", due_date: "", status: "upcoming" });
      setShowMilestoneForm(false);
      toast.success("Milestone added");
    },
    onError: () => toast.error("Couldn't add that milestone"),
  });

  const patchMilestone = useMutation({
    mutationFn: ({ msId, data }: { msId: string; data: Partial<Milestone> }) =>
      api.patch(`/milestones/${msId}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["milestones", id] }),
    onError: () => toast.error("Couldn't update that milestone"),
  });

  const deleteMilestone = useMutation({
    mutationFn: (msId: string) => api.delete(`/milestones/${msId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["milestones", id] });
      toast.success("Milestone removed");
    },
    onError: () => toast.error("Couldn't remove that milestone"),
  });

  const postUpdate = useMutation({
    mutationFn: (content: string) =>
      api.post(`/projects/${id}/updates`, { content }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-updates", id] });
      setUpdateText("");
      toast.success("Update posted", { description: "Visible in the client's portal." });
    },
    onError: () => toast.error("Couldn't post that update"),
  });

  const deleteProject = useMutation({
    mutationFn: () => api.delete(`/projects/${id}`),
    onSuccess: () => {
      toast.success("Project deleted");
      router.push("/admin/projects");
    },
    onError: () => toast.error("Couldn't delete that project"),
  });

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-card" />
        ))}
      </div>
    );
  }

  if (!project) {
    return (
      <Card>
        <EmptyState
          icon={Megaphone}
          title="Project not found"
          description="It may have been deleted."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/projects"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-subtle transition-colors hover:text-fg"
      >
        <ArrowLeft size={13} aria-hidden="true" />
        All projects
      </Link>

      <OnboardingCard projectId={project.id} />

      <Card>
        <CardContent className="pt-6">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-fg">
                {project.name}
              </h1>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-faint">
                {orgName ?? "Unknown client"}
              </p>
            </div>
            <StatusPill descriptor={PROJECT_STATUS[project.status]} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Status" htmlFor="proj-status">
              <Select
                id="proj-status"
                value={project.status}
                onChange={(e) =>
                  patchProject.mutate({ status: e.target.value as ProjectStatus })
                }
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label={`Completion — ${project.completion_percentage}%`}
              htmlFor="proj-completion"
            >
              <div className="flex h-11 items-center gap-3 sm:h-10">
                <input
                  id="proj-completion"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={project.completion_percentage}
                  onChange={(e) =>
                    patchProject.mutate({
                      completion_percentage: Number(e.target.value),
                    })
                  }
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-[var(--brand)]"
                />
                <span className="tabular w-10 shrink-0 text-right text-sm font-semibold text-fg">
                  {project.completion_percentage}%
                </span>
              </div>
            </Field>

            <Field label="Start date" htmlFor="proj-start">
              <Input
                id="proj-start"
                type="date"
                defaultValue={project.start_date ?? ""}
                onBlur={(e) =>
                  patchProject.mutate({ start_date: e.target.value || null })
                }
              />
            </Field>

            <Field label="Target date" htmlFor="proj-target">
              <Input
                id="proj-target"
                type="date"
                defaultValue={project.target_date ?? ""}
                onBlur={(e) =>
                  patchProject.mutate({ target_date: e.target.value || null })
                }
              />
            </Field>
          </div>

          <div className="mt-5">
            <Field
              label="Description"
              htmlFor="proj-description"
              hint="Saved when you click away."
            >
              <Textarea
                id="proj-description"
                rows={3}
                defaultValue={project.description ?? ""}
                onBlur={(e) =>
                  patchProject.mutate({ description: e.target.value || null })
                }
              />
            </Field>
          </div>

          <div className="mt-6">
            <Progress
              value={project.completion_percentage}
              label={`${project.name} progress`}
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="milestones">
        <div className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          <TabsList>
            <TabsTrigger value="milestones">Milestones ({milestones.length})</TabsTrigger>
            <TabsTrigger value="updates">Updates ({updates.length})</TabsTrigger>
            <TabsTrigger value="comments">Client comments</TabsTrigger>
            <TabsTrigger value="danger">Settings</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="milestones">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
              <h2 className="text-sm font-semibold tracking-tight text-fg">Milestones</h2>
              <Button
                size="sm"
                variant={showMilestoneForm ? "ghost" : "outline"}
                onClick={() => setShowMilestoneForm((v) => !v)}
              >
                <Plus size={13} aria-hidden="true" />
                {showMilestoneForm ? "Cancel" : "Add milestone"}
              </Button>
            </div>

            {showMilestoneForm && (
              <div className="animate-fade-up space-y-4 border-b border-hairline px-5 py-5">
                <Field label="Title" htmlFor="ms-title" required>
                  <Input
                    id="ms-title"
                    autoFocus
                    value={newMilestone.title}
                    onChange={(e) =>
                      setNewMilestone((m) => ({ ...m, title: e.target.value }))
                    }
                    placeholder="Data pipeline build"
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Due date" htmlFor="ms-due">
                    <Input
                      id="ms-due"
                      type="date"
                      value={newMilestone.due_date}
                      onChange={(e) =>
                        setNewMilestone((m) => ({ ...m, due_date: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Status" htmlFor="ms-status">
                    <Select
                      id="ms-status"
                      value={newMilestone.status}
                      onChange={(e) =>
                        setNewMilestone((m) => ({ ...m, status: e.target.value }))
                      }
                    >
                      {MILESTONE_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => createMilestone.mutate(newMilestone)}
                    disabled={!newMilestone.title.trim()}
                    loading={createMilestone.isPending}
                  >
                    Add milestone
                  </Button>
                </div>
              </div>
            )}

            {milestones.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-subtle">
                No milestones yet. Add the first phase above.
              </p>
            ) : (
              <ul>
                {[...milestones]
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((m) => (
                    <li
                      key={m.id}
                      className="flex flex-wrap items-center gap-3 border-b border-hairline px-5 py-4 last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-fg">{m.title}</p>
                        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-faint">
                          {m.status === "completed"
                            ? `Done ${formatDate(m.completed_date)}`
                            : `Due ${formatDate(m.due_date)}`}
                        </p>
                      </div>
                      <StatusPill
                        descriptor={MILESTONE_STATUS[m.status]}
                        size="sm"
                        className="hidden sm:inline-flex"
                      />
                      <Select
                        aria-label={`Status for ${m.title}`}
                        value={m.status}
                        onChange={(e) =>
                          patchMilestone.mutate({
                            msId: m.id,
                            data: { status: e.target.value as MilestoneStatus },
                          })
                        }
                        className="h-9 w-auto min-w-[8.5rem] text-xs"
                      >
                        {MILESTONE_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </Select>
                      <button
                        onClick={() => deleteMilestone.mutate(m.id)}
                        aria-label={`Delete ${m.title}`}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-faint transition-colors hover:bg-danger-wash hover:text-danger cursor-pointer"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="updates">
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-5">
                <Field
                  label="Post an update"
                  htmlFor="new-update"
                  hint="Appears in the client's portal and notifies them."
                >
                  <Textarea
                    id="new-update"
                    rows={3}
                    value={updateText}
                    onChange={(e) => setUpdateText(e.target.value)}
                    placeholder="Share progress, what just landed, or what's coming next…"
                  />
                </Field>
                <div className="mt-3 flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => postUpdate.mutate(updateText.trim())}
                    disabled={!updateText.trim()}
                    loading={postUpdate.isPending}
                  >
                    {!postUpdate.isPending && <Send size={13} aria-hidden="true" />}
                    Post update
                  </Button>
                </div>
              </CardContent>
            </Card>

            {updates.length === 0 ? (
              <Card>
                <EmptyState
                  icon={Megaphone}
                  title="No updates posted"
                  description="Updates keep the client informed without them having to ask."
                />
              </Card>
            ) : (
              <ul className="space-y-3">
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
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="comments">
          <Card>
            <CardContent className="pt-6">
              <CommentsPanel
                projectId={id}
                targetType="project"
                title="All comments on this project"
                emptyHint="Remarks your client leaves on this project appear here. You can also start a thread yourself."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger">
          <Card className="border-danger/25">
            <CardContent className="pt-6">
              <h2 className="text-sm font-semibold tracking-tight text-fg">
                Delete this project
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-subtle">
                Removes the project and everything attached to it — milestones,
                updates, files, requests and comments. This cannot be undone.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                {confirmingDelete ? (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => deleteProject.mutate()}
                      loading={deleteProject.isPending}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      Yes, delete {project.name}
                    </Button>
                    <Button variant="ghost" onClick={() => setConfirmingDelete(false)}>
                      Keep it
                    </Button>
                  </>
                ) : (
                  <Button variant="destructive" onClick={() => setConfirmingDelete(true)}>
                    <Trash2 size={14} aria-hidden="true" />
                    Delete project
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
