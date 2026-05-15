"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import api from "@/lib/api";
import { Building2, FolderOpen, MessageSquare, Users, ArrowRight, Plus } from "lucide-react";
import type { Organization, Project } from "@/lib/types";

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | undefined; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value ?? "—"}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export default function AdminOverview() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => api.get("/admin/stats").then(r => r.data),
  });
  const { data: clients } = useQuery<Organization[]>({
    queryKey: ["admin-clients"],
    queryFn: () => api.get("/organizations").then(r => r.data),
  });
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["admin-projects"],
    queryFn: () => api.get("/projects").then(r => r.data),
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Clients" value={stats?.clients} icon={Building2} color="bg-[#FFB3B3]/30 text-[#A92E2E]" />
        <StatCard label="Active Projects" value={stats?.projects} icon={FolderOpen} color="bg-blue-50 text-blue-600" />
        <StatCard label="Open Requests" value={stats?.open_requests} icon={MessageSquare} color="bg-amber-50 text-amber-600" />
        <StatCard label="Total Users" value={stats?.total_users} icon={Users} color="bg-emerald-50 text-emerald-600" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent clients */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Clients</h2>
            <Link href="/admin/clients" className="flex items-center gap-1 text-xs text-[#A92E2E] font-medium hover:underline">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {clients?.slice(0, 5).map(c => (
              <Link key={c.id} href={`/admin/clients/${c.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-400">{c.industry ?? "—"}</p>
                </div>
                <ArrowRight size={14} className="text-slate-300" />
              </Link>
            ))}
            {!clients?.length && <p className="px-5 py-6 text-sm text-slate-400 text-center">No clients yet</p>}
          </div>
          <div className="px-5 py-3 border-t border-slate-100">
            <Link href="/admin/clients" className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#A92E2E] transition-colors">
              <Plus size={13} /> New client
            </Link>
          </div>
        </div>

        {/* Recent projects */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Projects</h2>
            <Link href="/admin/projects" className="flex items-center gap-1 text-xs text-[#A92E2E] font-medium hover:underline">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {projects?.slice(0, 5).map(p => (
              <Link key={p.id} href={`/admin/projects/${p.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-400 capitalize">{p.status.replace("_", " ")} · {p.completion_percentage}%</p>
                </div>
                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#A92E2E] rounded-full" style={{ width: `${p.completion_percentage}%` }} />
                </div>
              </Link>
            ))}
            {!projects?.length && <p className="px-5 py-6 text-sm text-slate-400 text-center">No projects yet</p>}
          </div>
          <div className="px-5 py-3 border-t border-slate-100">
            <Link href="/admin/projects/new" className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#A92E2E] transition-colors">
              <Plus size={13} /> New project
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
