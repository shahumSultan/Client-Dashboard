"use client";
import { CheckSquare } from "lucide-react";

export default function MilestonesPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900">Milestones</h1>
        <p className="text-sm text-slate-500 mt-0.5">Track milestones across all your projects</p>
      </div>
      <div className="text-center py-16 bg-white rounded-xl border border-slate-200 border-dashed">
        <CheckSquare size={36} className="mx-auto text-slate-300 mb-3" />
        <p className="text-slate-500 font-medium">Select a project to view milestones</p>
      </div>
    </div>
  );
}
