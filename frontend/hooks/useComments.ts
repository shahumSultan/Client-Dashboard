"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { CommentThread, CommentTargetType } from "@/lib/types";

/**
 * Threads are cached per (project, target) so a milestone's comment list can
 * refetch without invalidating every other thread on the page.
 */
export function commentsKey(
  projectId: string,
  targetType?: CommentTargetType,
  targetId?: string
) {
  return ["comments", projectId, targetType ?? "all", targetId ?? "all"] as const;
}

export function useComments(
  projectId: string,
  targetType?: CommentTargetType,
  targetId?: string
) {
  return useQuery<CommentThread[]>({
    queryKey: commentsKey(projectId, targetType, targetId),
    queryFn: async () => {
      const { data } = await api.get(`/comments/project/${projectId}`, {
        params: {
          ...(targetType ? { target_type: targetType } : {}),
          ...(targetId ? { target_id: targetId } : {}),
        },
      });
      return data;
    },
    enabled: !!projectId,
  });
}

/** Invalidate every thread list for a project — cheap, and keeps counts honest. */
function useInvalidateProjectComments(projectId: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["comments", projectId] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };
}

export function useCreateComment(projectId: string) {
  const invalidate = useInvalidateProjectComments(projectId);
  return useMutation({
    mutationFn: async (payload: {
      target_type: CommentTargetType;
      target_id?: string | null;
      body: string;
    }) => {
      const { data } = await api.post(`/comments/project/${projectId}`, payload);
      return data as CommentThread;
    },
    onSuccess: invalidate,
  });
}

export function useReplyToComment(projectId: string) {
  const invalidate = useInvalidateProjectComments(projectId);
  return useMutation({
    mutationFn: async ({ commentId, body }: { commentId: string; body: string }) => {
      const { data } = await api.post(`/comments/${commentId}/replies`, { body });
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useResolveComment(projectId: string) {
  const invalidate = useInvalidateProjectComments(projectId);
  return useMutation({
    mutationFn: async ({
      commentId,
      isResolved,
    }: {
      commentId: string;
      isResolved: boolean;
    }) => {
      const { data } = await api.patch(`/comments/${commentId}/resolve`, {
        is_resolved: isResolved,
      });
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteComment(projectId: string) {
  const invalidate = useInvalidateProjectComments(projectId);
  return useMutation({
    mutationFn: async (commentId: string) => {
      await api.delete(`/comments/${commentId}`);
    },
    onSuccess: invalidate,
  });
}
