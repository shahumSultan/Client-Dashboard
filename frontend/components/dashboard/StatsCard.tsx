import * as React from "react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  trend?: { value: string; positive: boolean };
  className?: string;
}

export function StatsCard({ icon, value, label, trend, className }: StatsCardProps) {
  return (
    <div className={cn("bg-white rounded-xl border border-slate-200/80 shadow-sm p-5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <p className="mt-1.5 text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
          {trend && (
            <p className={cn("mt-1 text-xs font-medium", trend.positive ? "text-emerald-600" : "text-red-500")}>
              {trend.value}
            </p>
          )}
        </div>
        <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
          {icon}
        </div>
      </div>
    </div>
  );
}
