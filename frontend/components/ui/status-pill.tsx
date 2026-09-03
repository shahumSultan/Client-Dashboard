import * as React from "react";
import {
  CircleDashed,
  CircleDot,
  CheckCircle2,
  AlertTriangle,
  PauseCircle,
  Hammer,
  FlaskConical,
  Eye,
  Rocket,
  XCircle,
  Clock,
  ArrowUp,
  Minus,
  Flame,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ProjectStatus,
  MilestoneStatus,
  RequestStatus,
  RequestPriority,
} from "@/lib/types";

type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "brand";

/**
 * Every status carries an icon as well as a colour. Colour alone is not an
 * accessible signal, and these pills are the primary way a client reads
 * "what's done vs what's left".
 */
const TONES: Record<Tone, string> = {
  neutral: "bg-white/[0.06] text-muted border-hairline",
  info: "bg-info-wash text-info border-info/25",
  success: "bg-success-wash text-success border-success/25",
  warning: "bg-warning-wash text-warning border-warning/25",
  danger: "bg-danger-wash text-danger border-danger/25",
  brand: "bg-brand-wash text-brand-soft border-brand/30",
};

interface Descriptor {
  label: string;
  tone: Tone;
  icon: LucideIcon;
}

export const PROJECT_STATUS: Record<ProjectStatus, Descriptor> = {
  planning: { label: "Planning", tone: "neutral", icon: CircleDashed },
  development: { label: "In development", tone: "brand", icon: Hammer },
  testing: { label: "Testing", tone: "info", icon: FlaskConical },
  review: { label: "In review", tone: "warning", icon: Eye },
  delivered: { label: "Delivered", tone: "success", icon: Rocket },
  on_hold: { label: "On hold", tone: "neutral", icon: PauseCircle },
};

export const MILESTONE_STATUS: Record<MilestoneStatus, Descriptor> = {
  upcoming: { label: "Upcoming", tone: "neutral", icon: CircleDashed },
  in_progress: { label: "In progress", tone: "brand", icon: CircleDot },
  completed: { label: "Completed", tone: "success", icon: CheckCircle2 },
  delayed: { label: "Delayed", tone: "danger", icon: AlertTriangle },
};

export const REQUEST_STATUS: Record<RequestStatus, Descriptor> = {
  pending: { label: "Pending", tone: "warning", icon: Clock },
  in_progress: { label: "In progress", tone: "brand", icon: CircleDot },
  completed: { label: "Completed", tone: "success", icon: CheckCircle2 },
  rejected: { label: "Declined", tone: "danger", icon: XCircle },
};

export const REQUEST_PRIORITY: Record<RequestPriority, Descriptor> = {
  low: { label: "Low", tone: "neutral", icon: Minus },
  medium: { label: "Medium", tone: "info", icon: Minus },
  high: { label: "High", tone: "warning", icon: ArrowUp },
  urgent: { label: "Urgent", tone: "danger", icon: Flame },
};

interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  descriptor: Descriptor;
  size?: "sm" | "md";
}

export function StatusPill({
  descriptor,
  size = "md",
  className,
  ...props
}: StatusPillProps) {
  const Icon = descriptor.icon;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border font-medium whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        TONES[descriptor.tone],
        className
      )}
      {...props}
    >
      <Icon size={size === "sm" ? 11 : 13} strokeWidth={2.25} aria-hidden="true" />
      {descriptor.label}
    </span>
  );
}
