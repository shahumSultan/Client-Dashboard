"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import {
  isTeamRole,
  type Organization, type Project, type Task, type TaskActivity, type TaskComment,
  type TaskInput, type TaskPriority, type TaskStatus, type TeamMember,
} from "@/lib/types";

export interface TaskFilters {
  department_id?: string;
  /** A user id, "me" or "none". */
  assignee?: string;
  priority?: TaskPriority | "";
  q?: string;
  project_id?: string;
  archived?: boolean;
}

const ROOT = ["tasks"] as const;

function params(f: TaskFilters) {
  const out: Record<string, string | boolean> = {};
  for (const [k, v] of Object.entries(f)) if (v !== undefined && v !== "" && v !== false) out[k] = v;
  return out;
}

export function useTasks(filters: TaskFilters = {}, { enabled = true }: { enabled?: boolean } = {}) {
  const p = params(filters);
  return useQuery<Task[]>({
    queryKey: [...ROOT, "list", p],
    queryFn: async () => (await api.get("/tasks", { params: p })).data,
    enabled,
  });
}

export function useTask(id: string | null) {
  return useQuery<Task>({
    queryKey: [...ROOT, "one", id],
    queryFn: async () => (await api.get(`/tasks/${id}`)).data,
    enabled: !!id,
  });
}

export function useTaskComments(id: string | null) {
  return useQuery<TaskComment[]>({
    queryKey: [...ROOT, "comments", id],
    queryFn: async () => (await api.get(`/tasks/${id}/comments`)).data,
    enabled: !!id,
  });
}

export function useTaskActivity(id: string | null) {
  return useQuery<TaskActivity[]>({
    queryKey: [...ROOT, "activity", id],
    queryFn: async () => (await api.get(`/tasks/${id}/activity`)).data,
    enabled: !!id,
  });
}

/** Any change can move a card, recount comments and add history. */
function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ROOT });
}

export function useCreateTask() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (data: TaskInput) => (await api.post("/tasks", data)).data as Task,
    onSuccess: invalidate,
  });
}

export function useUpdateTask() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TaskInput> & { is_archived?: boolean } }) =>
      (await api.patch(`/tasks/${id}`, data)).data as Task,
    onSuccess: invalidate,
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    // Only the lists refresh. Refetching the deleted task's own queries
    // (its panel is still open for a moment) would just turn up 404s.
    onSuccess: () => qc.invalidateQueries({ queryKey: [...ROOT, "list"] }),
  });
}

/**
 * Drag and drop. The board applies the move to its own list first, so the
 * card stays where it was dropped; on failure the refetch puts it back.
 */
export function useMoveTask() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, status, after_id }: { id: string; status: TaskStatus; after_id: string | null }) =>
      (await api.post(`/tasks/${id}/move`, { status, after_id })).data as Task,
    onSettled: invalidate,
  });
}

export function useAddComment(taskId: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (body: string) =>
      (await api.post(`/tasks/${taskId}/comments`, { body })).data as TaskComment,
    onSuccess: invalidate,
  });
}

export function useDeleteComment(taskId: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (commentId: string) => api.delete(`/tasks/${taskId}/comments/${commentId}`),
    onSuccess: invalidate,
  });
}

// ── Options for the task form ────────────────────────────────────────────────

export interface PersonOption {
  user_id: string;
  name: string;
  avatar_url: string | null;
}

/**
 * Who a task can be assigned to: everyone on the team with access. Read from
 * the Team directory, which employees can open (unlike the admin user list).
 */
export function useAssignablePeople() {
  return useQuery<TeamMember[], Error, PersonOption[]>({
    queryKey: ["company", "team"],
    queryFn: async () => (await api.get("/company/team")).data,
    select: (team) =>
      team
        .filter((m) => m.user_id && m.account?.is_active && isTeamRole(m.account.role))
        .map((m) => ({ user_id: m.user_id!, name: m.name, avatar_url: m.account!.avatar_url }))
        .sort((a, b) => a.name.localeCompare(b.name)),
  });
}

/** "Client · Project" choices. Admin-only: employees can't link projects. */
export function useProjectOptions({ enabled }: { enabled: boolean }) {
  const projects = useQuery<Project[]>({
    queryKey: ["admin-projects"],
    queryFn: async () => (await api.get("/projects")).data,
    enabled,
  });
  const orgs = useQuery<Organization[]>({
    queryKey: ["admin-clients"],
    queryFn: async () => (await api.get("/organizations")).data,
    enabled,
  });
  const names = new Map((orgs.data ?? []).map((o) => [o.id, o.name]));
  return (projects.data ?? [])
    .map((p) => ({ id: p.id, label: `${names.get(p.organization_id) ?? "Client"} · ${p.name}` }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
