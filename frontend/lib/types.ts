export type UserRole = "admin" | "client_owner" | "client_member";

export interface User {
  id: string;
  clerk_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  organization_id: string | null;
  is_active: boolean;
  created_at: string;
}

export type ProjectStatus = "planning" | "development" | "testing" | "review" | "delivered" | "on_hold";

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  completion_percentage: number;
  start_date: string | null;
  target_date: string | null;
  delivered_date: string | null;
  project_type: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectUpdate {
  id: string;
  project_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

export type MilestoneStatus = "upcoming" | "in_progress" | "completed" | "delayed";

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: MilestoneStatus;
  due_date: string | null;
  completed_date: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export type RequestCategory = "feature" | "bug" | "change" | "question" | "other";
export type RequestStatus = "pending" | "in_progress" | "completed" | "rejected";
export type RequestPriority = "low" | "medium" | "high" | "urgent";

export interface ClientRequest {
  id: string;
  project_id: string;
  submitted_by: string;
  assigned_to: string | null;
  title: string;
  description: string;
  category: RequestCategory;
  status: RequestStatus;
  priority: RequestPriority;
  admin_response: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface File {
  id: string;
  project_id: string;
  milestone_id: string | null;
  uploaded_by: string;
  name: string;
  original_name: string;
  file_type: string | null;
  size_bytes: number | null;
  public_url: string | null;
  description: string | null;
  version: number;
  is_deliverable: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string | null;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface AnalyticsEntry {
  id: string;
  project_id: string;
  period_start: string;
  period_end: string;
  leads_processed: number | null;
  conversions: number | null;
  conversion_rate: number | null;
  revenue_attributed: number | null;
  metrics: Record<string, unknown> | null;
  summary: string | null;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website: string | null;
  industry: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export type CommentTargetType = "project" | "milestone" | "update" | "file";

export interface CommentAuthor {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  role: UserRole;
}

export interface Comment {
  id: string;
  project_id: string;
  target_type: CommentTargetType;
  target_id: string;
  parent_id: string | null;
  body: string;
  is_resolved: boolean;
  edited_at: string | null;
  created_at: string;
  author: CommentAuthor;
}

export interface CommentThread extends Comment {
  replies: Comment[];
}

export interface InboxThread extends CommentThread {
  project: { id: string; name: string };
}
