"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Organization } from "@/lib/types";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const STATUSES = ["planning", "development", "testing", "review", "delivered", "on_hold"];
const PROJECT_TYPES = ["AI Automation", "Lead Generation", "CRM Integration", "Document Processing", "Custom AI", "Other"];

export default function NewProjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedOrg = searchParams.get("org") ?? "";

  const [form, setForm] = useState({
    organization_id: preselectedOrg,
    name: "",
    description: "",
    status: "planning",
    project_type: "",
    start_date: "",
    target_date: "",
  });

  const { data: orgs } = useQuery<Organization[]>({
    queryKey: ["admin-clients"],
    queryFn: () => api.get("/organizations").then(r => r.data),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: typeof form) => api.post("/projects", {
      ...data,
      start_date: data.start_date || null,
      target_date: data.target_date || null,
      description: data.description || null,
      project_type: data.project_type || null,
    }).then(r => r.data),
    onSuccess: (project) => {
      toast.success("Project created");
      router.push(`/admin/projects/${project.id}`);
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? "Failed to create project"),
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const canSubmit = form.organization_id && form.name;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/projects" className="text-slate-400 hover:text-slate-700 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">New Project</h1>
          <p className="text-sm text-slate-400">Create a project for a client</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Client *</label>
            <select
              value={form.organization_id}
              onChange={e => set("organization_id", e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A92E2E]/30 focus:border-[#A92E2E]"
            >
              <option value="">Select a client…</option>
              {orgs?.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Project Name *</label>
            <input
              value={form.name}
              onChange={e => set("name", e.target.value)}
              placeholder="Sales Automation System"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A92E2E]/30 focus:border-[#A92E2E]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="Brief overview of what this project involves…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#A92E2E]/30 focus:border-[#A92E2E]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Status</label>
              <select
                value={form.status}
                onChange={e => set("status", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm capitalize focus:outline-none focus:ring-2 focus:ring-[#A92E2E]/30 focus:border-[#A92E2E]"
              >
                {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Project Type</label>
              <select
                value={form.project_type}
                onChange={e => set("project_type", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A92E2E]/30 focus:border-[#A92E2E]"
              >
                <option value="">Select type…</option>
                {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => set("start_date", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A92E2E]/30 focus:border-[#A92E2E]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Target Date</label>
              <input
                type="date"
                value={form.target_date}
                onChange={e => set("target_date", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A92E2E]/30 focus:border-[#A92E2E]"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <Link href="/admin/projects" className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors">
            Cancel
          </Link>
          <button
            onClick={() => mutate(form)}
            disabled={isPending || !canSubmit}
            className="px-5 py-2 text-sm font-semibold bg-[#A92E2E] hover:bg-[#8B2424] text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? "Creating…" : "Create Project"}
          </button>
        </div>
      </div>
    </div>
  );
}
