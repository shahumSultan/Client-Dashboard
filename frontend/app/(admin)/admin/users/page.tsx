"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { User, Organization } from "@/lib/types";
import { Users } from "lucide-react";
import { toast } from "sonner";

const ROLE_COLOR: Record<string, string> = {
  admin: "bg-[#FFB3B3]/30 text-[#A92E2E]",
  client_owner: "bg-blue-50 text-blue-700",
  client_member: "bg-slate-100 text-slate-600",
};

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["admin-users"],
    queryFn: () => api.get("/admin/users").then(r => r.data),
  });
  const { data: orgs } = useQuery<Organization[]>({
    queryKey: ["admin-clients"],
    queryFn: () => api.get("/organizations").then(r => r.data),
  });

  const orgMap = Object.fromEntries((orgs ?? []).map(o => [o.id, o.name]));

  const updateRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.patch(`/admin/users/${userId}/role`, { role }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("Role updated"); },
    onError: () => toast.error("Failed to update role"),
  });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Users</h1>
        <p className="text-sm text-slate-500">{users?.length ?? 0} user{users?.length !== 1 ? "s" : ""}</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : users?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Users size={40} className="text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No users yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {users?.map(u => (
              <div key={u.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-[#FFB3B3]/20 flex items-center justify-center text-[#A92E2E] text-sm font-semibold shrink-0">
                    {u.full_name?.[0]?.toUpperCase() ?? u.email?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{u.full_name ?? "—"}</p>
                    <p className="text-xs text-slate-400 truncate">{u.email || u.clerk_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  {u.organization_id && (
                    <span className="text-xs text-slate-400 hidden sm:block">{orgMap[u.organization_id] ?? "Unknown org"}</span>
                  )}
                  <select
                    value={u.role}
                    onChange={e => updateRole.mutate({ userId: u.id, role: e.target.value })}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-[#A92E2E]/20 cursor-pointer capitalize ${ROLE_COLOR[u.role] ?? "bg-slate-100 text-slate-600"}`}
                  >
                    <option value="admin">Admin</option>
                    <option value="client_owner">Client Owner</option>
                    <option value="client_member">Client Member</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
