"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Invitation, UserRole } from "@/lib/types";

export function useInvitations(organizationId?: string, includeSpent = false) {
  return useQuery<Invitation[]>({
    queryKey: ["invitations", organizationId ?? "all", includeSpent],
    queryFn: async () => {
      const { data } = await api.get("/invitations", {
        params: {
          ...(organizationId ? { organization_id: organizationId } : {}),
          include_spent: includeSpent,
        },
      });
      return data;
    },
  });
}

export function useCreateInvitation(organizationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { email: string; role: UserRole }) => {
      const { data } = await api.post("/invitations", {
        organization_id: organizationId,
        ...payload,
      });
      return data as Invitation;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invitations"] }),
  });
}

export function useRevokeInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      await api.delete(`/invitations/${invitationId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invitations"] }),
  });
}

/** The link an admin sends. Absolute so it survives a paste into email. */
export function inviteUrl(token: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/join/${token}`;
}

// ── Team invitations ─────────────────────────────────────────────────────────
// Same "invitations" key prefix, so revoking (shared endpoint) refreshes both.

export function useTeamInvitations({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<Invitation[]>({
    queryKey: ["invitations", "team"],
    queryFn: async () => (await api.get("/company/team/invitations")).data,
    enabled,
  });
}

export function useCreateTeamInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { email: string; role: "admin" | "employee" }) =>
      (await api.post("/company/team/invitations", payload)).data as Invitation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invitations"] }),
  });
}
