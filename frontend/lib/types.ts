/** "staff": an Enigma-Cube team member with view-only access to the admin panel. */
export type UserRole = "admin" | "staff" | "client_owner" | "client_member";

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

export interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  role: UserRole;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
  is_pending: boolean;
  /** Only meaningful on the response that created the invitation. */
  email_sent: boolean;
}

export interface InvitationPreview {
  organization_name: string;
  email: string;
  role: UserRole;
  expires_at: string;
}

export type EngagementStage =
  | "draft"
  | "awaiting_signature"
  | "awaiting_payment"
  | "kickoff"
  | "complete";

export interface Deliverable {
  title: string;
  detail: string | null;
}

export interface TimelinePhase {
  phase: string;
  duration: string | null;
}

export interface LineItem {
  description: string;
  quantity: number;
  /** Minor units — cents. */
  unit_amount: number;
}

export interface AgreementFile {
  filename: string;
  size_bytes: number;
  page_count: number;
  sha256: string;
  uploaded_at: string;
}

export interface Engagement {
  id: string;
  project_id: string;
  project_name: string | null;
  organization_name: string | null;
  stage: EngagementStage;

  /** "form": built from the fields below. "pdf": the admin's uploaded document. */
  agreement_source: "form" | "pdf";
  document: AgreementFile | null;

  agreement_title: string;
  scope: string | null;
  deliverables: Deliverable[] | null;
  timeline: TimelinePhase[] | null;
  revision_policy: string | null;
  payment_terms: string | null;
  additional_terms: string | null;
  sent_at: string | null;
  sender_name: string | null;
  agreement_hash: string | null;

  signed_at: string | null;
  signer_name: string | null;
  signer_title: string | null;
  signer_email: string | null;
  signer_ip: string | null;

  invoice_number: string | null;
  currency: string;
  line_items: LineItem[] | null;
  invoice_total: number;
  invoice_due_date: string | null;
  invoice_notes: string | null;
  stripe_payment_url: string | null;
  bank_details: string | null;
  payment_reported_at: string | null;
  payment_method: "bank" | "stripe" | null;
  payment_reference: string | null;
  paid_at: string | null;

  welcome_message: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_channel: string | null;
  response_time: string | null;
  working_hours: string | null;
  next_steps: string[] | null;
  welcome_read_at: string | null;

  call_booking_url: string | null;
  call_agenda: string[] | null;
  call_scheduled_for: string | null;
  call_prep_notes: string | null;
  call_completed_at: string | null;

  created_at: string;
  updated_at: string;
  /** Only on the response to sending. */
  emailed?: string[];
}

/** Everything an admin authors — the editable subset of an Engagement. */
export type EngagementDraft = Partial<
  Pick<
    Engagement,
    | "agreement_source" | "agreement_title" | "scope" | "deliverables" | "timeline"
    | "revision_policy" | "payment_terms" | "additional_terms"
    | "invoice_number" | "currency" | "line_items" | "invoice_due_date"
    | "invoice_notes" | "stripe_payment_url" | "bank_details"
    | "welcome_message" | "contact_email" | "contact_phone" | "contact_channel"
    | "response_time" | "working_hours" | "next_steps"
    | "call_booking_url" | "call_agenda"
  >
>;
