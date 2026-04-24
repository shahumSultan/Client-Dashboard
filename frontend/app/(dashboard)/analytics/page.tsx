"use client";
import { BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-500 mt-0.5">Business impact and performance insights</p>
      </div>
      <div className="text-center py-16 bg-white rounded-xl border border-slate-200 border-dashed">
        <BarChart3 size={36} className="mx-auto text-slate-300 mb-3" />
        <p className="text-slate-500 font-medium">Select a project to view analytics</p>
      </div>
    </div>
  );
}
