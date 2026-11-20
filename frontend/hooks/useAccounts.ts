"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { User, UserRole } from "@/lib/types";

/**
 * Portal accounts: roles, access, and people waiting without an invitation.
 * Admin-only on the server. A change can move someone onto or off the team,
 * which reshapes the Team list, departments and client member lists, so every
 * one of those refreshes.
 */
function useInvalidateAccounts() {
  const qc = useQueryClient();
  return () => {
    for (const key of [["admin-users"], ["admin-users-waiting"], ["company", "team"], ["departments"]]) {
      qc.invalidateQueries({ queryKey: key });
    }
  };
}

export function useWaitingUsers({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<User[]>({
    queryKey: ["admin-users-waiting"],
    queryFn: async () => (await api.get("/admin/users/waiting")).data,
    enabled,
  });
}

export function useSetRole() {
  const invalidate = useInvalidateAccounts();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      api.patch(`/admin/users/${userId}/role`, { role }).then((r) => r.data as User),
    onSuccess: invalidate,
  });
}

export function useSetAccess() {
  const invalidate = useInvalidateAccounts();
  return useMutation({
    mutationFn: ({ userId, active }: { userId: string; active: boolean }) =>
      api.patch(`/admin/users/${userId}/access`, { active }).then((r) => r.data as User),
    onSuccess: invalidate,
  });
}
