"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import api from "@/lib/api";
import type { Project, Organization } from "@/lib/types";
import { FolderOpen, Plus, ArrowRight } from "lucide-react";

const STATUS_COLOR: Record<string, string> = {
  planning: "bg-slate-100 text-slate-600",
  development: "bg-blue-50 text-blue-700",
  testing: "bg-amber-50 text-amber-700",
  review: "bg-purple-50 text-purple-700",
  delivered: "bg-emerald-50 text-emerald-700",
  on_hold: "bg-red-50 text-red-600",
};

export default function AdminProjectsPage() {
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["admin-projects"],
    queryFn: () => api.get("/projects").then(r => r.data),
  });
  const { data: orgs } = useQuery<Organization[]>({
    queryKey: ["admin-clients"],
    queryFn: () => api.get("/organizations").then(r => r.data),
  });

  const orgMap = Object.fromEntries((orgs ?? []).map(o => [o.id, o.name]));

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Projects</h1>
          <p className="text-sm text-slate-500">{projects?.length ?? 0} project{projects?.length !== 1 ? "s" : ""} across all clients</p>
        </div>
        <Link
          href="/admin/projects/new"
          className="flex items-center gap-2 bg-[#A92E2E] hover:bg-[#8B2424] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus size={15} /> New Project
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : projects?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <FolderOpen size={40} className="text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No projects yet</p>
          <p className="text-sm text-slate-400 mb-4">Create your first project for a client</p>
          <Link href="/admin/projects/new" className="flex items-center gap-2 bg-[#A92E2E] text-white text-sm font-semibold px-4 py-2 rounded-lg">
            <Plus size={14} /> New Project
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {projects?.map(p => (
              <Link key={p.id} href={`/admin/projects/${p.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors group">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#FFB3B3]/20 flex items-center justify-center shrink-0">
                    <FolderOpen size={16} className="text-[#A92E2E]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{p.name}</p>
                    <p className="text-xs text-slate-400">{orgMap[p.organization_id] ?? p.organization_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#A92E2E] rounded-full transition-all" style={{ width: `${p.completion_percentage}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 w-8">{p.completion_percentage}%</span>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLOR[p.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {p.status.replace("_", " ")}
                  </span>
                  <ArrowRight size={14} className="text-slate-300 group-hover:text-[#A92E2E] transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
