import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse a date from the API.
 *
 * The backend stores UTC as naive timestamps, so they arrive without a zone
 * ("2026-09-11T01:14:15") and `new Date` would read them as local time -
 * hours off, and on the wrong day near midnight. Bare dates ("2026-09-16")
 * have the opposite problem: `new Date` reads those as UTC midnight, which is
 * the previous day anywhere west of Greenwich. Each is pinned down here.
 */
export function parseApiDate(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(value);
  return new Date(hasZone ? value : `${value}Z`);
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "-";
  return format(parseApiDate(date), "MMM d, yyyy");
}

export function timeAgo(date: string): string {
  return formatDistanceToNow(parseApiDate(date), { addSuffix: true });
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "-";
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
