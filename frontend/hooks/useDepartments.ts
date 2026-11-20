"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { isTeamRole, type Department, type DepartmentInput, type User } from "@/lib/types";

const KEY = ["departments"] as const;

export function useDepartments() {
  return useQuery<Department[]>({
    queryKey: KEY,
    queryFn: async () => (await api.get("/departments")).data,
  });
}

/** Membership shows on the Team list too, so both refresh together. */
function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: KEY });
    qc.invalidateQueries({ queryKey: ["company", "team"] });
  };
}

export function useSaveDepartment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: DepartmentInput }) =>
      (id ? api.put(`/departments/${id}`, data) : api.post("/departments", data)).then(
        (r) => r.data as Department
      ),
    onSuccess: invalidate,
  });
}

export function useDeleteDepartment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/departments/${id}`),
    onSuccess: invalidate,
  });
}

export function useDepartmentMember() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ deptId, userId, add }: { deptId: string; userId: string; add: boolean }) =>
      (add
        ? api.put(`/departments/${deptId}/members/${userId}`)
        : api.delete(`/departments/${deptId}/members/${userId}`)
      ).then((r) => r.data as Department),
    onSuccess: invalidate,
  });
}

/**
 * Team accounts an admin can put in a department. Shares the Users page's
 * cache key, so a role change there shows up here.
 */
export function useTeamAccounts({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<User[], Error, User[]>({
    queryKey: ["admin-users"],
    queryFn: async () => (await api.get("/admin/users")).data,
    select: (users) => users.filter((u) => isTeamRole(u.role)),
    enabled,
  });
}
