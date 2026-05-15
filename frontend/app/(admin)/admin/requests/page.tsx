"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { ClientRequest } from "@/lib/types";
import { MessageSquare, X, Send } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  in_progress: "bg-blue-50 text-blue-700",
  completed: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-600",
};

const PRIORITY_COLOR: Record<string, string> = {
  low: "text-slate-400",
  medium: "text-amber-500",
  high: "text-orange-500",
  urgent: "text-red-600",
};

function RequestDrawer({ req, onClose }: { req: ClientRequest; onClose: () => void }) {
  const qc = useQueryClient();
  const [response, setResponse] = useState(req.admin_response ?? "");
  const [status, setStatus] = useState(req.status);

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.patch(`/requests/${req.id}`, { status, admin_response: response || null }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-requests"] }); qc.invalidateQueries({ queryKey: ["admin-stats"] }); toast.success("Request updated"); onClose(); },
    onError: () => toast.error("Failed to update request"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 truncate pr-4">{req.title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 shrink-0"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex gap-2 flex-wrap">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLOR[req.status]}`}>{req.status.replace("_", " ")}</span>
            <span className={`text-[11px] font-semibold capitalize ${PRIORITY_COLOR[req.priority]}`}>{req.priority} priority</span>
            <span className="text-[11px] text-slate-400 capitalize">{req.category}</span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{req.description}</p>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as ClientRequest["status"])}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A92E2E]/20 focus:border-[#A92E2E]"
            >
              {["pending", "in_progress", "completed", "rejected"].map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Your Response</label>
            <textarea
              rows={4}
              value={response}
              onChange={e => setResponse(e.target.value)}
              placeholder="Reply to the client…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#A92E2E]/20 focus:border-[#A92E2E]"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors">Cancel</button>
          <button
            onClick={() => mutate()}
            disabled={isPending}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-[#A92E2E] hover:bg-[#8B2424] text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Send size={13} /> {isPending ? "Saving…" : "Save & Notify"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminRequestsPage() {
  const [selected, setSelected] = useState<ClientRequest | null>(null);
  const { data: requests, isLoading } = useQuery<ClientRequest[]>({
    queryKey: ["admin-requests"],
    queryFn: () => api.get("/admin/requests").then(r => r.data),
  });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Requests</h1>
        <p className="text-sm text-slate-500">{requests?.filter(r => r.status === "pending" || r.status === "in_progress").length ?? 0} open requests</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : requests?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <MessageSquare size={40} className="text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No requests yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {requests?.map(r => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${r.status === "pending" ? "bg-amber-400" : r.status === "in_progress" ? "bg-blue-400" : r.status === "completed" ? "bg-emerald-400" : "bg-red-300"}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{r.title}</p>
                    <p className="text-xs text-slate-400 capitalize">{r.category} · {new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span className={`text-[11px] font-semibold ${PRIORITY_COLOR[r.priority]} capitalize hidden sm:block`}>{r.priority}</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLOR[r.status]}`}>{r.status.replace("_", " ")}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {selected && <RequestDrawer req={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
