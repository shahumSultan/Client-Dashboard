import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  label?: string;
}

export function Progress({ value = 0, label, className, ...props }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Progress"}
      className={cn(
        "relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]",
        className
      )}
      {...props}
    >
      <div
        // Animate width via transition rather than layout thrash; the bar is a
        // fixed-height track so this never reflows surrounding content.
        className="h-full rounded-full bg-gradient-to-r from-brand to-brand-soft transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
