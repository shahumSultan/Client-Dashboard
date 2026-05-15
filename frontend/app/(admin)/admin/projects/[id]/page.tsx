"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import api from "@/lib/api";
import type { Project, Milestone, ProjectUpdate, Organization } from "@/lib/types";
import {
  ArrowLeft, CheckCircle2, Circle, Clock, Plus, Trash2,
  ChevronDown, ChevronUp, Send, Edit2, Check, X,
} from "lucide-react";
import { toast } from "sonner";

const STATUSES = ["planning", "development", "testing", "review", "delivered", "on_hold"];
const MILESTONE_STATUSES = ["upcoming", "in_progress", "completed", "delayed"];

const STATUS_COLOR: Record<string, string> = {
  planning: "bg-slate-100 text-slate-600",
  development: "bg-blue-50 text-blue-700",
  testing: "bg-amber-50 text-amber-700",
  review: "bg-purple-50 text-purple-700",
  delivered: "bg-emerald-50 text-emerald-700",
  on_hold: "bg-red-50 text-red-600",
};

const MS_ICON: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 size={14} className="text-emerald-500" />,
  in_progress: <div className="w-3.5 h-3.5 rounded-full border-2 border-[#A92E2E] flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-[#A92E2E]" /></div>,
  upcoming: <Circle size={14} className="text-slate-300" />,
  delayed: <Clock size={14} className="text-amber-500" />,
};

/* ─── Inline editable field ──────────────────────────────────────── */
function InlineEdit({ value, onSave, className = "" }: { value: string; onSave: (v: string) => void; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { onSave(val); setEditing(false); } if (e.key === "Escape") { setVal(value); setEditing(false); } }}
          className={`border border-[#A92E2E] rounded px-2 py-0.5 focus:outline-none text-sm ${className}`}
        />
        <button onClick={() => { onSave(val); setEditing(false); }} className="text-emerald-500 hover:text-emerald-700"><Check size={13} /></button>
        <button onClick={() => { setVal(value); setEditing(false); }} className="text-slate-400 hover:text-slate-600"><X size={13} /></button>
      </div>
    );
  }
  return (
    <span className={`group flex items-center gap-1.5 cursor-pointer ${className}`} onClick={() => setEditing(true)}>
      {value || <span className="text-slate-400 italic">Click to edit</span>}
      <Edit2 size={11} className="text-slate-300 group-hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-all" />
    </span>
  );
}

export default function AdminProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [updateText, setUpdateText] = useState("");
  const [newMilestone, setNewMilestone] = useState({ title: "", due_date: "", status: "upcoming" });
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"milestones" | "updates">("milestones");

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ["project", id],
    queryFn: () => api.get(`/projects/${id}`).then(r => r.data),
  });
  const { data: milestones } = useQuery<Milestone[]>({
    queryKey: ["milestones", id],
    queryFn: () => api.get(`/milestones/project/${id}`).then(r => r.data),
  });
  const { data: updates } = useQuery<ProjectUpdate[]>({
    queryKey: ["project-updates", id],
    queryFn: () => api.get(`/projects/${id}/updates`).then(r => r.data),
  });
  const { data: orgs } = useQuery<Organization[]>({
    queryKey: ["admin-clients"],
    queryFn: () => api.get("/organizations").then(r => r.data),
  });

  const orgName = orgs?.find(o => o.id === project?.organization_id)?.name;

  const patchProject = useMutation({
    mutationFn: (data: Partial<Project>) => api.patch(`/projects/${id}`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["project", id] }); qc.invalidateQueries({ queryKey: ["admin-projects"] }); },
    onError: () => toast.error("Failed to update project"),
  });

  const createMilestone = useMutation({
    mutationFn: (data: typeof newMilestone) => api.post("/milestones", {
      project_id: id,
      title: data.title,
      status: data.status,
      due_date: data.due_date || null,
      order_index: milestones?.length ?? 0,
    }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["milestones", id] });
      setNewMilestone({ title: "", due_date: "", status: "upcoming" });
      setShowMilestoneForm(false);
      toast.success("Milestone added");
    },
    onError: () => toast.error("Failed to add milestone"),
  });

  const patchMilestone = useMutation({
    mutationFn: ({ msId, data }: { msId: string; data: Partial<Milestone> }) =>
      api.patch(`/milestones/${msId}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["milestones", id] }),
    onError: () => toast.error("Failed to update milestone"),
  });

  const deleteMilestone = useMutation({
    mutationFn: (msId: string) => api.delete(`/milestones/${msId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["milestones", id] }); toast.success("Milestone removed"); },
    onError: () => toast.error("Failed to delete milestone"),
  });

  const postUpdate = useMutation({
    mutationFn: (content: string) => api.post(`/projects/${id}/updates`, { content }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["project-updates", id] }); setUpdateText(""); toast.success("Update posted"); },
    onError: () => toast.error("Failed to post update"),
  });

  const deleteProject = useMutation({
    mutationFn: () => api.delete(`/projects/${id}`),
    onSuccess: () => { toast.success("Project deleted"); router.push("/admin/projects"); },
    onError: () => toast.error("Failed to delete project"),
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}
      </div>
    );
  }
  if (!project) return <p className="text-slate-400">Project not found.</p>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/projects" className="text-slate-400 hover:text-slate-700 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {orgName && <Link href={`/admin/clients/${project.organization_id}`} className="text-xs text-slate-400 hover:text-[#A92E2E] transition-colors">{orgName}</Link>}
            {orgName && <span className="text-slate-300">/</span>}
            <InlineEdit
              value={project.name}
              onSave={v => patchProject.mutate({ name: v })}
              className="text-xl font-bold text-slate-900"
            />
          </div>
          <p className="text-sm text-slate-400 mt-0.5">{project.project_type ?? "AI Project"}</p>
        </div>
      </div>

      {/* Project details card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Status</label>
            <select
              value={project.status}
              onChange={e => patchProject.mutate({ status: e.target.value as Project["status"] })}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-[#A92E2E]/20 cursor-pointer ${STATUS_COLOR[project.status] ?? "bg-slate-100 text-slate-600"}`}
            >
              {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
          </div>

          {/* Completion */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Completion</label>
            <div className="flex items-center gap-2">
              <input
                type="range" min={0} max={100} step={5}
                value={project.completion_percentage}
                onChange={e => patchProject.mutate({ completion_percentage: Number(e.target.value) })}
                className="flex-1 accent-[#A92E2E]"
              />
              <span className="text-sm font-bold text-slate-900 w-10 text-right">{project.completion_percentage}%</span>
            </div>
          </div>

          {/* Start date */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Start Date</label>
            <input
              type="date"
              value={project.start_date ?? ""}
              onChange={e => patchProject.mutate({ start_date: e.target.value || null })}
              className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#A92E2E]/20 focus:border-[#A92E2E] w-full"
            />
          </div>

          {/* Target date */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Target Date</label>
            <input
              type="date"
              value={project.target_date ?? ""}
              onChange={e => patchProject.mutate({ target_date: e.target.value || null })}
              className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#A92E2E]/20 focus:border-[#A92E2E] w-full"
            />
          </div>
        </div>

        {/* Description */}
        <div className="mt-5 pt-5 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Description</label>
          <InlineEdit
            value={project.description ?? ""}
            onSave={v => patchProject.mutate({ description: v || null })}
            className="text-sm text-slate-600 leading-relaxed"
          />
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#A92E2E] rounded-full transition-all duration-500" style={{ width: `${project.completion_percentage}%` }} />
        </div>

        {/* Danger zone */}
        <div className="mt-5 pt-5 border-t border-slate-100 flex justify-end">
          <button
            onClick={() => { if (confirm("Delete this project? This cannot be undone.")) deleteProject.mutate(); }}
            className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            Delete project
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-1">
        {(["milestones", "updates"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors capitalize border-b-2 -mb-px ${
              activeTab === tab ? "border-[#A92E2E] text-[#A92E2E]" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab}
            {tab === "milestones" && milestones && <span className="ml-1.5 text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{milestones.length}</span>}
          </button>
        ))}
      </div>

      {/* Milestones tab */}
      {activeTab === "milestones" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Milestones</h2>
            <button
              onClick={() => setShowMilestoneForm(v => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold bg-[#A92E2E] text-white px-3 py-1.5 rounded-lg hover:bg-[#8B2424] transition-colors"
            >
              {showMilestoneForm ? <><X size={12} /> Cancel</> : <><Plus size={12} /> Add Milestone</>}
            </button>
          </div>

          {showMilestoneForm && (
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="grid sm:grid-cols-3 gap-3">
                <input
                  placeholder="Milestone title *"
                  value={newMilestone.title}
                  onChange={e => setNewMilestone(m => ({ ...m, title: e.target.value }))}
                  className="sm:col-span-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A92E2E]/20 focus:border-[#A92E2E]"
                />
                <input
                  type="date"
                  value={newMilestone.due_date}
                  onChange={e => setNewMilestone(m => ({ ...m, due_date: e.target.value }))}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A92E2E]/20 focus:border-[#A92E2E]"
                />
                <div className="flex gap-2">
                  <select
                    value={newMilestone.status}
                    onChange={e => setNewMilestone(m => ({ ...m, status: e.target.value }))}
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm capitalize focus:outline-none focus:ring-2 focus:ring-[#A92E2E]/20 focus:border-[#A92E2E]"
                  >
                    {MILESTONE_STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                  <button
                    onClick={() => createMilestone.mutate(newMilestone)}
                    disabled={!newMilestone.title || createMilestone.isPending}
                    className="px-3 py-2 bg-[#A92E2E] text-white rounded-lg text-sm font-semibold hover:bg-[#8B2424] disabled:opacity-50 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {milestones?.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-400 text-center">No milestones yet. Add the first one above.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {milestones?.map((m, i) => (
                <div key={m.id} className="flex items-center gap-3 px-5 py-3.5 group">
                  <div className="shrink-0">{MS_ICON[m.status]}</div>
                  <div className="flex-1 min-w-0">
                    <InlineEdit
                      value={m.title}
                      onSave={v => patchMilestone.mutate({ msId: m.id, data: { title: v } })}
                      className="text-sm font-medium text-slate-900"
                    />
                    {m.due_date && <p className="text-xs text-slate-400 mt-0.5">Due {new Date(m.due_date).toLocaleDateString()}</p>}
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <select
                      value={m.status}
                      onChange={e => patchMilestone.mutate({ msId: m.id, data: { status: e.target.value as Milestone["status"] } })}
                      className="text-xs border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#A92E2E]/20 capitalize"
                    >
                      {MILESTONE_STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                    </select>
                    <button
                      onClick={() => deleteMilestone.mutate(m.id)}
                      className="text-slate-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Updates tab */}
      {activeTab === "updates" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Post Update to Client</label>
            <textarea
              rows={3}
              value={updateText}
              onChange={e => setUpdateText(e.target.value)}
              placeholder="Share progress, milestones completed, or what's coming next…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#A92E2E]/20 focus:border-[#A92E2E]"
            />
            <div className="flex justify-end mt-3">
              <button
                onClick={() => postUpdate.mutate(updateText)}
                disabled={!updateText.trim() || postUpdate.isPending}
                className="flex items-center gap-2 bg-[#A92E2E] hover:bg-[#8B2424] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                <Send size={14} /> Post Update
              </button>
            </div>
          </div>

          {updates?.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No updates posted yet.</p>
          ) : (
            <div className="space-y-3">
              {updates?.map(u => (
                <div key={u.id} className="bg-white rounded-xl border border-slate-200 p-5">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{u.content}</p>
                  <p className="text-xs text-slate-400 mt-3">{new Date(u.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
