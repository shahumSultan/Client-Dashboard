import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  /** Say what will fill this space and, where possible, what to do next. */
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-16 text-center",
        className
      )}
    >
      <div className="glass mb-5 grid h-14 w-14 place-items-center rounded-2xl">
        <Icon size={22} className="text-brand-soft" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold tracking-tight text-fg">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-subtle">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
