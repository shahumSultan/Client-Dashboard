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

export const STATUS_COLORS: Record<string, string> = {
  planning: "bg-slate-100 text-slate-700",
  development: "bg-blue-100 text-blue-700",
  testing: "bg-yellow-100 text-yellow-700",
  review: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  on_hold: "bg-gray-100 text-gray-600",
  upcoming: "bg-slate-100 text-slate-600",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  delayed: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-700",
  rejected: "bg-red-100 text-red-700",
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};
