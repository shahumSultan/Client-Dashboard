"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Project, ProjectUpdate, Milestone, ClientRequest, File, AnalyticsEntry } from "@/lib/types";

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data } = await api.get("/projects");
      return data;
    },
  });
}

export function useProject(id: string) {
  return useQuery<Project>({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data } = await api.get(`/projects/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useProjectUpdates(projectId: string) {
  return useQuery<ProjectUpdate[]>({
    queryKey: ["project-updates", projectId],
    queryFn: async () => {
      const { data } = await api.get(`/projects/${projectId}/updates`);
      return data;
    },
    enabled: !!projectId,
  });
}

export function useMilestones(projectId: string) {
  return useQuery<Milestone[]>({
    queryKey: ["milestones", projectId],
    queryFn: async () => {
      const { data } = await api.get(`/milestones/project/${projectId}`);
      return data;
    },
    enabled: !!projectId,
  });
}

export function useRequests(projectId: string) {
  return useQuery<ClientRequest[]>({
    queryKey: ["requests", projectId],
    queryFn: async () => {
      const { data } = await api.get(`/requests/project/${projectId}`);
      return data;
    },
    enabled: !!projectId,
  });
}

export function useFiles(projectId: string) {
  return useQuery<File[]>({
    queryKey: ["files", projectId],
    queryFn: async () => {
      const { data } = await api.get(`/files/project/${projectId}`);
      return data;
    },
    enabled: !!projectId,
  });
}

export function useAnalytics(projectId: string) {
  return useQuery<AnalyticsEntry[]>({
    queryKey: ["analytics", projectId],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/project/${projectId}`);
      return data;
    },
    enabled: !!projectId,
  });
}

export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      project_id: string;
      title: string;
      description: string;
      category: string;
      priority: string;
    }) => {
      const { data } = await api.post("/requests", payload);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["requests", vars.project_id] });
    },
  });
}
