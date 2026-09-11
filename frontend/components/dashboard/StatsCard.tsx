import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsCardProps {
  icon: LucideIcon;
  value: number | string;
  label: string;
  /** Secondary line - e.g. "3 of 8 complete". */
  detail?: string;
  loading?: boolean;
  className?: string;
}

export function StatsCard({
  icon: Icon,
  value,
  label,
  detail,
  loading = false,
  className,
}: StatsCardProps) {
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-subtle">{label}</p>
          {loading ? (
            <Skeleton className="mt-2 h-9 w-16" />
          ) : (
            <p className="tabular mt-1.5 text-3xl font-semibold tracking-tight text-fg">
              {value}
            </p>
          )}
          {detail && !loading && (
            <p className="mt-1 text-xs text-faint">{detail}</p>
          )}
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-wash text-brand-soft">
          <Icon size={18} strokeWidth={2} aria-hidden="true" />
        </span>
      </div>
    </Card>
  );
}
