"use client";
import { MessageSquare } from "lucide-react";

export default function RequestsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900">Requests</h1>
        <p className="text-sm text-slate-500 mt-0.5">View all your submitted requests across projects</p>
      </div>
      <div className="text-center py-16 bg-white rounded-xl border border-slate-200 border-dashed">
        <MessageSquare size={36} className="mx-auto text-slate-300 mb-3" />
        <p className="text-slate-500 font-medium">Select a project to view and submit requests</p>
        <p className="text-slate-400 text-sm mt-1">Navigate to a project and use the Requests tab</p>
      </div>
    </div>
  );
}
