"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import api from "@/lib/api";
import type { Organization } from "@/lib/types";
import { Plus, Building2, ArrowRight, Globe, X } from "lucide-react";
import { toast } from "sonner";

function CreateClientModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", slug: "", industry: "", website: "", description: "" });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: typeof form) => api.post("/organizations", data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-clients"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Client created");
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? "Failed to create client"),
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const autoSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">New Client</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Company Name *</label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A92E2E]/30 focus:border-[#A92E2E]"
              value={form.name}
              onChange={e => { set("name", e.target.value); set("slug", autoSlug(e.target.value)); }}
              placeholder="Acme Law Group"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Slug *</label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#A92E2E]/30 focus:border-[#A92E2E]"
              value={form.slug}
              onChange={e => set("slug", e.target.value)}
              placeholder="acme-law-group"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Industry</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A92E2E]/30 focus:border-[#A92E2E]" value={form.industry} onChange={e => set("industry", e.target.value)} placeholder="Legal" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Website</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A92E2E]/30 focus:border-[#A92E2E]" value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Description</label>
            <textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#A92E2E]/30 focus:border-[#A92E2E]" value={form.description} onChange={e => set("description", e.target.value)} placeholder="Brief description..." />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors">Cancel</button>
          <button
            onClick={() => mutate(form)}
            disabled={isPending || !form.name || !form.slug}
            className="px-5 py-2 text-sm font-semibold bg-[#A92E2E] hover:bg-[#8B2424] text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? "Creating…" : "Create Client"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const { data: clients, isLoading } = useQuery<Organization[]>({
    queryKey: ["admin-clients"],
    queryFn: () => api.get("/organizations").then(r => r.data),
  });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Clients</h1>
          <p className="text-sm text-slate-500">{clients?.length ?? 0} organization{clients?.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-[#A92E2E] hover:bg-[#8B2424] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus size={15} /> New Client
        </button>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : clients?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Building2 size={40} className="text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No clients yet</p>
          <p className="text-sm text-slate-400 mb-4">Add your first client to get started</p>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-[#A92E2E] text-white text-sm font-semibold px-4 py-2 rounded-lg">
            <Plus size={14} /> Add Client
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {clients?.map(c => (
            <Link key={c.id} href={`/admin/clients/${c.id}`} className="group bg-white rounded-xl border border-slate-200 hover:border-[#FFB3B3]/60 hover:shadow-md transition-all p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFB3B3]/20 flex items-center justify-center">
                  <Building2 size={18} className="text-[#A92E2E]" />
                </div>
                <ArrowRight size={16} className="text-slate-300 group-hover:text-[#A92E2E] transition-colors mt-1" />
              </div>
              <p className="font-semibold text-slate-900 mb-1">{c.name}</p>
              <p className="text-xs text-slate-400">{c.industry ?? "No industry"}</p>
              {c.website && (
                <p className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                  <Globe size={10} /> {c.website}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}

      {showCreate && <CreateClientModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
