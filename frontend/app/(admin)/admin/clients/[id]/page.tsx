"use client";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import api from "@/lib/api";
import type { Organization, Project, User } from "@/lib/types";
import { Building2, FolderOpen, Users, ArrowRight, Plus, Globe, ExternalLink } from "lucide-react";

const STATUS_COLOR: Record<string, string> = {
  planning: "bg-slate-100 text-slate-600",
  development: "bg-blue-50 text-blue-700",
  testing: "bg-amber-50 text-amber-700",
  review: "bg-purple-50 text-purple-700",
  delivered: "bg-emerald-50 text-emerald-700",
  on_hold: "bg-red-50 text-red-600",
};

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: org, isLoading: orgLoading } = useQuery<Organization>({
    queryKey: ["org", id],
    queryFn: () => api.get(`/organizations/${id}`).then(r => r.data),
  });
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["admin-projects"],
    queryFn: () => api.get("/projects").then(r => r.data),
    select: (data) => data.filter(p => p.organization_id === id),
  });
  const { data: users } = useQuery<User[]>({
    queryKey: ["admin-users"],
    queryFn: () => api.get("/admin/users").then(r => r.data),
    select: (data) => data.filter(u => u.organization_id === id),
  });

  if (orgLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  if (!org) return <p className="text-slate-400">Client not found.</p>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FFB3B3]/20 flex items-center justify-center">
              <Building2 size={24} className="text-[#A92E2E]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{org.name}</h1>
              <p className="text-sm text-slate-400">{org.industry ?? "No industry"} · /{org.slug}</p>
            </div>
          </div>
          {org.website && (
            <a href={org.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#A92E2E] transition-colors">
              <Globe size={13} /> {org.website} <ExternalLink size={11} />
            </a>
          )}
        </div>
        {org.description && <p className="mt-4 text-sm text-slate-500 leading-relaxed">{org.description}</p>}
      </div>

      {/* Projects */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FolderOpen size={16} className="text-slate-400" />
            <h2 className="font-semibold text-slate-900">Projects</h2>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{projects?.length ?? 0}</span>
          </div>
          <Link
            href={`/admin/projects/new?org=${id}`}
            className="flex items-center gap-1.5 text-xs font-semibold bg-[#A92E2E] text-white px-3 py-1.5 rounded-lg hover:bg-[#8B2424] transition-colors"
          >
            <Plus size={12} /> New Project
          </Link>
        </div>
        {projects?.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-400 text-center">No projects for this client yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {projects?.map(p => (
              <Link key={p.id} href={`/admin/projects/${p.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <FolderOpen size={14} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.project_type ?? "AI Project"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLOR[p.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {p.status.replace("_", " ")}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#A92E2E] rounded-full" style={{ width: `${p.completion_percentage}%` }} />
                    </div>
                    {p.completion_percentage}%
                  </div>
                  <ArrowRight size={14} className="text-slate-300 group-hover:text-[#A92E2E] transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Users */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <Users size={16} className="text-slate-400" />
          <h2 className="font-semibold text-slate-900">Members</h2>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{users?.length ?? 0}</span>
        </div>
        {users?.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-400 text-center">No users assigned to this client yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {users?.map(u => (
              <div key={u.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#FFB3B3]/20 flex items-center justify-center text-[#A92E2E] text-xs font-semibold">
                    {u.full_name?.[0]?.toUpperCase() ?? u.email?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{u.full_name ?? "—"}</p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-slate-500 capitalize">{u.role.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
