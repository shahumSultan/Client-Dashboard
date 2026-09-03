import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "MMM d, yyyy");
}

export function timeAgo(date: string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const STATUS_LABELS: Record<string, string> = {
  planning: "Planning",
  development: "Development",
  testing: "Testing",
  review: "Review",
  delivered: "Delivered",
  on_hold: "On Hold",
  upcoming: "Upcoming",
  in_progress: "In Progress",
  completed: "Completed",
  delayed: "Delayed",
  pending: "Pending",
  rejected: "Rejected",
  feature: "Feature Request",
  bug: "Bug Report",
  change: "Change Request",
  question: "Question",
  other: "Other",
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};
