"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, Send, Save, Undo2, Trash2, FileSignature, CircleCheck, Circle,
  CreditCard, Sparkles, CalendarClock, Eye, Upload, Loader2,
} from "lucide-react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RowsEditor, ListEditor } from "@/components/admin/RowsEditor";
import { AgreementDocument } from "@/components/onboarding/AgreementDocument";
import { InvoiceDocument } from "@/components/onboarding/InvoiceDocument";
import { formatCallTime, DocumentLink } from "@/components/onboarding/ClientPanels";
import { PdfDocument } from "@/components/onboarding/PdfDocument";
import {
  useEngagements, useCreateEngagement, useUpdateEngagement, useEngagementAction,
  useDeleteEngagement, useAgreementDocument, errorDetail,
} from "@/hooks/useEngagements";
import { formatMoney, CURRENCIES } from "@/lib/money";
import { cn, formatDate } from "@/lib/utils";
import { StageBadge } from "@/components/onboarding/StageBadge";
import { useReadOnly } from "@/lib/read-only";
import type { Engagement, EngagementDraft, Project } from "@/lib/types";

// ── Form model ───────────────────────────────────────────────────────────────
// Inputs hold strings; the API wants numbers in minor units and nulls for
// blanks. Converting at the edges keeps every input a plain controlled field.

type Row<K extends string> = Record<K, string>;

interface Form {
  agreement_source: "form" | "pdf";
  agreement_title: string;
  scope: string;
  deliverables: Row<"title" | "detail">[];
  timeline: Row<"phase" | "duration">[];
  revision_policy: string;
  payment_terms: string;
  additional_terms: string;
  invoice_number: string;
  currency: string;
  line_items: Row<"description" | "quantity" | "price">[];
  invoice_due_date: string;
  invoice_notes: string;
  stripe_payment_url: string;
  bank_details: string;
  welcome_message: string;
  contact_email: string;
  contact_phone: string;
  contact_channel: string;
  response_time: string;
  working_hours: string;
  next_steps: string[];
  call_booking_url: string;
  call_agenda: string[];
}

function toForm(e: EngagementDraft): Form {
  return {
    agreement_source: e.agreement_source ?? "form",
    agreement_title: e.agreement_title ?? "Project Agreement",
    scope: e.scope ?? "",
    deliverables: (e.deliverables ?? []).map((d) => ({ title: d.title, detail: d.detail ?? "" })),
    timeline: (e.timeline ?? []).map((t) => ({ phase: t.phase, duration: t.duration ?? "" })),
    revision_policy: e.revision_policy ?? "",
    payment_terms: e.payment_terms ?? "",
    additional_terms: e.additional_terms ?? "",
    invoice_number: e.invoice_number ?? "",
    currency: e.currency ?? "USD",
    line_items: (e.line_items ?? []).map((l) => ({
      description: l.description,
      quantity: String(l.quantity),
      price: (l.unit_amount / 100).toFixed(2),
    })),
    invoice_due_date: e.invoice_due_date ?? "",
    invoice_notes: e.invoice_notes ?? "",
    stripe_payment_url: e.stripe_payment_url ?? "",
    bank_details: e.bank_details ?? "",
    welcome_message: e.welcome_message ?? "",
    contact_email: e.contact_email ?? "",
    contact_phone: e.contact_phone ?? "",
    contact_channel: e.contact_channel ?? "",
    response_time: e.response_time ?? "",
    working_hours: e.working_hours ?? "",
    next_steps: e.next_steps ?? [],
    call_booking_url: e.call_booking_url ?? "",
    call_agenda: e.call_agenda ?? [],
  };
}

const blank = (s: string) => (s.trim() ? s.trim() : null);

function agreementPart(f: Form): EngagementDraft {
  return {
    agreement_source: f.agreement_source,
    agreement_title: f.agreement_title.trim() || "Project Agreement",
    scope: blank(f.scope),
    deliverables: f.deliverables
      .filter((d) => d.title.trim())
      .map((d) => ({ title: d.title.trim(), detail: blank(d.detail) })),
    timeline: f.timeline
      .filter((t) => t.phase.trim())
      .map((t) => ({ phase: t.phase.trim(), duration: blank(t.duration) })),
    revision_policy: blank(f.revision_policy),
    payment_terms: blank(f.payment_terms),
    additional_terms: blank(f.additional_terms),
  };
}

function invoicePart(f: Form): EngagementDraft {
  return {
    invoice_number: blank(f.invoice_number),
    currency: f.currency,
    line_items: f.line_items
      .filter((l) => l.description.trim())
      .map((l) => ({
        description: l.description.trim(),
        quantity: Math.max(1, parseInt(l.quantity, 10) || 1),
        unit_amount: Math.round((parseFloat(l.price) || 0) * 100),
      })),
    invoice_due_date: f.invoice_due_date || null,
    invoice_notes: blank(f.invoice_notes),
    stripe_payment_url: blank(f.stripe_payment_url),
    bank_details: blank(f.bank_details),
  };
}

function restPart(f: Form): EngagementDraft {
  return {
    welcome_message: blank(f.welcome_message),
    contact_email: blank(f.contact_email),
    contact_phone: blank(f.contact_phone),
    contact_channel: blank(f.contact_channel),
    response_time: blank(f.response_time),
    working_hours: blank(f.working_hours),
    next_steps: f.next_steps.map((s) => s.trim()).filter(Boolean),
    call_booking_url: blank(f.call_booking_url),
    call_agenda: f.call_agenda.map((s) => s.trim()).filter(Boolean),
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminOnboardingPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: project } = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: () => api.get(`/projects/${projectId}`).then((r) => r.data),
  });
  const { data: engagements, isLoading } = useEngagements(projectId);
  const engagement = engagements?.[0];

  const create = useCreateEngagement();
  const [preparing, setPreparing] = useState(false);

  async function prepare() {
    setPreparing(true);
    try {
      // Start from the terms used last time, so they are written once.
      const defaults = await qc.fetchQuery<EngagementDraft>({
        queryKey: ["engagement-defaults"],
        queryFn: () => api.get("/engagements/defaults").then((r) => r.data),
        staleTime: 0,
      });
      await create.mutateAsync({
        project_id: projectId,
        ...defaults,
        scope: project?.description ?? null,
      });
    } catch (err) {
      toast.error(errorDetail(err, "Couldn't start onboarding"));
    } finally {
      setPreparing(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/admin/projects/${projectId}`}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-subtle transition-colors hover:text-fg"
      >
        <ArrowLeft size={13} aria-hidden="true" />
        {project?.name ?? "Project"}
      </Link>

      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-card" />
      ) : !engagement ? (
        <Card>
          <EmptyState
            icon={FileSignature}
            title="No onboarding yet"
            description="Prepare the agreement, invoice, welcome pack and kickoff call for this project. Your usual terms are filled in from last time."
            action={
              <Button onClick={prepare} loading={preparing}>
                {!preparing && <FileSignature size={14} aria-hidden="true" />}
                Prepare onboarding
              </Button>
            }
          />
        </Card>
      ) : (
        <Editor engagement={engagement} />
      )}
    </div>
  );
}

function Editor({ engagement: e }: { engagement: Engagement }) {
  const [form, setForm] = useState<Form>(() => toForm(e));
  const [tab, setTab] = useState("agreement");
  const update = useUpdateEngagement(e.id);
  const viewOnly = useReadOnly();
  const actions = useEngagementAction(e.id);
  const remove = useDeleteEngagement();

  // Re-seed when the server copy moves on (another tab, a client action).
  const serverKey = `${e.id}:${e.updated_at}`;
  const [seenKey, setSeenKey] = useState(serverKey);
  const [dirty, setDirty] = useState(false);
  // Adjusting state during render, not in an effect: React re-renders at once
  // with the new form instead of painting the stale one first.
  if (serverKey !== seenKey && !dirty) {
    setSeenKey(serverKey);
    setForm(toForm(e));
  }

  const agreementLocked = !!e.sent_at;
  const invoiceLocked = !!(e.payment_reported_at || e.paid_at);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  }

  const payload = useMemo<EngagementDraft>(
    () => ({
      ...(agreementLocked ? {} : agreementPart(form)),
      ...(invoiceLocked ? {} : invoicePart(form)),
      ...restPart(form),
    }),
    [form, agreementLocked, invoiceLocked]
  );

  // Preview what the client will see, from the unsaved form.
  const preview: Engagement = { ...e, ...agreementPart(form), ...invoicePart(form), ...restPart(form),
    invoice_total: (invoicePart(form).line_items ?? []).reduce((s, l) => s + l.quantity * l.unit_amount, 0),
  } as Engagement;

  async function save(quiet = false) {
    try {
      const saved = await update.mutateAsync(payload);
      setDirty(false);
      setSeenKey(`${saved.id}:${saved.updated_at}`);
      if (!quiet) toast.success("Saved");
      return true;
    } catch (err) {
      toast.error(errorDetail(err, "Couldn't save"));
      return false;
    }
  }

  async function send() {
    if (dirty && !(await save(true))) return;
    try {
      const sent = await actions.send.mutateAsync();
      const n = sent.emailed?.length ?? 0;
      toast.success("Sent to the client", {
        description: n
          ? `Emailed ${sent.emailed!.join(", ")}.`
          : "Nobody was emailed — invite someone to this client, or share the portal link yourself.",
      });
    } catch (err) {
      toast.error(errorDetail(err, "Couldn't send"));
    }
  }

  async function run(action: { mutateAsync: () => Promise<unknown> }, ok: string) {
    try {
      await action.mutateAsync();
      toast.success(ok);
    } catch (err) {
      toast.error(errorDetail(err, "That didn't work"));
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px] xl:items-start">
      <div className="min-w-0 space-y-5">
        <Card className="px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="truncate text-lg font-semibold tracking-tight text-fg">Onboarding</h1>
                <StageBadge stage={e.stage} />
              </div>
              <p className="mt-1 text-xs text-subtle">
                {e.organization_name} · {e.project_name}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => save()} loading={update.isPending} disabled={!dirty}>
                {!update.isPending && <Save size={13} aria-hidden="true" />}
                {dirty ? "Save" : "Saved"}
              </Button>
              {e.stage === "draft" ? (
                <Button size="sm" onClick={send} loading={actions.send.isPending}>
                  {!actions.send.isPending && <Send size={13} aria-hidden="true" />}
                  Send to client
                </Button>
              ) : !e.signed_at ? (
                <Button variant="ghost" size="sm" onClick={() => run(actions.recall, "Recalled to draft")} loading={actions.recall.isPending}>
                  <Undo2 size={13} aria-hidden="true" />
                  Recall to edit
                </Button>
              ) : null}
              {!e.signed_at && !viewOnly && (
                <button
                  type="button"
                  aria-label="Delete onboarding"
                  onClick={() => {
                    if (confirm("Delete this onboarding? The client will no longer see it.")) {
                      remove.mutate(e.id, { onSuccess: () => toast.success("Deleted") });
                    }
                  }}
                  className="grid h-8 w-8 cursor-pointer place-items-center rounded-[10px] text-faint transition-colors hover:bg-danger-wash hover:text-danger"
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </Card>

        <Tabs value={tab} onValueChange={setTab}>
          <div className="-mx-4 overflow-x-auto px-4">
            <TabsList>
              <TabsTrigger value="agreement">Agreement</TabsTrigger>
              <TabsTrigger value="invoice">Invoice</TabsTrigger>
              <TabsTrigger value="welcome">Welcome</TabsTrigger>
              <TabsTrigger value="call">Kickoff call</TabsTrigger>
              <TabsTrigger value="preview">
                <Eye size={13} className="mr-1.5 inline" aria-hidden="true" />
                Preview
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="agreement">
            <Card>
              <CardContent className="space-y-6 pt-6">
                {agreementLocked && (
                  <Locked>
                    {e.signed_at
                      ? "Signed — the agreement can no longer change."
                      : "Sent — recall it to draft to make changes. The client will need to re-open it."}
                  </Locked>
                )}
                <fieldset disabled={agreementLocked} className="space-y-6">
                  <SourceToggle value={form.agreement_source} onChange={(v) => set("agreement_source", v)} />
                  <Field label="Title" htmlFor="ag-title" hint="Shown above the document and on the signature certificate.">
                    <Input id="ag-title" value={form.agreement_title} onChange={(ev) => set("agreement_title", ev.target.value)} />
                  </Field>
                  {form.agreement_source === "pdf" ? (
                    <AgreementUpload
                      engagement={e}
                      onUploaded={() => setForm((f) => ({ ...f, agreement_source: "pdf" }))}
                    />
                  ) : (
                  <>
                  <Field label="Scope of work" htmlFor="ag-scope" required hint="What's in — and, where it matters, what's out.">
                    <Textarea id="ag-scope" rows={5} className="resize-y" value={form.scope} onChange={(ev) => set("scope", ev.target.value)} />
                  </Field>
                  <RowsEditor
                    label="Deliverables *"
                    rows={form.deliverables}
                    columns={[
                      { key: "title", label: "Deliverable", placeholder: "Marketing website" },
                      { key: "detail", label: "Detail", placeholder: "5 pages, CMS, responsive", width: "1.4fr" },
                    ]}
                    empty={{ title: "", detail: "" }}
                    onChange={(rows) => set("deliverables", rows)}
                    addLabel="Add deliverable"
                  />
                  <RowsEditor
                    label="Timeline *"
                    rows={form.timeline}
                    columns={[
                      { key: "phase", label: "Phase", placeholder: "Discovery & design" },
                      { key: "duration", label: "When", placeholder: "Weeks 1–2", width: "180px" },
                    ]}
                    empty={{ phase: "", duration: "" }}
                    onChange={(rows) => set("timeline", rows)}
                    addLabel="Add phase"
                  />
                  <Field label="Revision policy" htmlFor="ag-rev" required>
                    <Textarea id="ag-rev" rows={3} className="resize-y" value={form.revision_policy} onChange={(ev) => set("revision_policy", ev.target.value)} />
                  </Field>
                  <Field label="Payment terms" htmlFor="ag-pay">
                    <Textarea id="ag-pay" rows={3} className="resize-y" value={form.payment_terms} onChange={(ev) => set("payment_terms", ev.target.value)} />
                  </Field>
                  <Field label="Other terms" htmlFor="ag-terms" hint="Ownership, termination, confidentiality — whatever you normally include.">
                    <Textarea id="ag-terms" rows={4} className="resize-y" value={form.additional_terms} onChange={(ev) => set("additional_terms", ev.target.value)} />
                  </Field>
                  </>
                  )}
                </fieldset>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoice">
            <Card>
              <CardContent className="space-y-6 pt-6">
                {invoiceLocked && <Locked>The client has paid against this invoice — it can no longer change.</Locked>}
                <fieldset disabled={invoiceLocked} className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Invoice number" htmlFor="inv-no">
                      <Input id="inv-no" value={form.invoice_number} onChange={(ev) => set("invoice_number", ev.target.value)} />
                    </Field>
                    <Field label="Currency" htmlFor="inv-cur">
                      <Select id="inv-cur" value={form.currency} onChange={(ev) => set("currency", ev.target.value)}>
                        {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </Select>
                    </Field>
                    <Field label="Due date" htmlFor="inv-due" hint="Blank means due on receipt">
                      <Input id="inv-due" type="date" value={form.invoice_due_date} onChange={(ev) => set("invoice_due_date", ev.target.value)} />
                    </Field>
                  </div>
                  <RowsEditor
                    label="Line items *"
                    rows={form.line_items}
                    columns={[
                      { key: "description", label: "Description", placeholder: "50% deposit — website build" },
                      { key: "quantity", label: "Qty", width: "80px", type: "number", inputMode: "numeric" },
                      { key: "price", label: `Price (${form.currency})`, width: "140px", type: "number", inputMode: "decimal" },
                    ]}
                    empty={{ description: "", quantity: "1", price: "" }}
                    onChange={(rows) => set("line_items", rows)}
                    addLabel="Add line item"
                  />
                  <p className="text-right text-sm text-subtle">
                    Total{" "}
                    <span className="tabular ml-2 text-lg font-semibold text-fg">
                      {formatMoney(preview.invoice_total, form.currency)}
                    </span>
                  </p>
                  <Field
                    label="Stripe payment link"
                    htmlFor="inv-stripe"
                    hint="Create a Payment Link for this amount in Stripe and paste it here."
                  >
                    <Input id="inv-stripe" type="url" placeholder="https://buy.stripe.com/…" value={form.stripe_payment_url} onChange={(ev) => set("stripe_payment_url", ev.target.value)} />
                  </Field>
                  <Field label="Bank transfer details" htmlFor="inv-bank" hint="Remembered for next time.">
                    <Textarea
                      id="inv-bank"
                      rows={4}
                      className="resize-y font-mono text-xs"
                      placeholder={"Account name: …\nIBAN: …\nSWIFT/BIC: …\nBank: …"}
                      value={form.bank_details}
                      onChange={(ev) => set("bank_details", ev.target.value)}
                    />
                  </Field>
                  <Field label="Notes" htmlFor="inv-notes">
                    <Textarea id="inv-notes" rows={2} className="resize-y" value={form.invoice_notes} onChange={(ev) => set("invoice_notes", ev.target.value)} />
                  </Field>
                </fieldset>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="welcome">
            <Card>
              <CardContent className="space-y-6 pt-6">
                <Field label="Welcome message" htmlFor="wel-msg" hint="Set the tone. Opens for the client right after payment.">
                  <Textarea id="wel-msg" rows={5} className="resize-y" value={form.welcome_message} onChange={(ev) => set("welcome_message", ev.target.value)} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Contact email" htmlFor="wel-email">
                    <Input id="wel-email" type="email" value={form.contact_email} onChange={(ev) => set("contact_email", ev.target.value)} />
                  </Field>
                  <Field label="Phone / WhatsApp" htmlFor="wel-phone">
                    <Input id="wel-phone" type="tel" value={form.contact_phone} onChange={(ev) => set("contact_phone", ev.target.value)} />
                  </Field>
                  <Field label="Day-to-day channel" htmlFor="wel-chan" hint="e.g. Slack — #acme-build, or this portal">
                    <Input id="wel-chan" value={form.contact_channel} onChange={(ev) => set("contact_channel", ev.target.value)} />
                  </Field>
                  <Field label="Response time" htmlFor="wel-resp">
                    <Input id="wel-resp" value={form.response_time} onChange={(ev) => set("response_time", ev.target.value)} />
                  </Field>
                  <Field label="Working hours" htmlFor="wel-hours" className="sm:col-span-2">
                    <Input id="wel-hours" value={form.working_hours} onChange={(ev) => set("working_hours", ev.target.value)} />
                  </Field>
                </div>
                <ListEditor
                  label="What happens next"
                  items={form.next_steps}
                  onChange={(v) => set("next_steps", v)}
                  placeholder="Kickoff call — align on goals"
                  addLabel="Add step"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="call">
            <Card>
              <CardContent className="space-y-6 pt-6">
                <Field
                  label="Booking link"
                  htmlFor="call-url"
                  hint="Your Calendly or Cal.com link. Without one, the client proposes a time instead."
                >
                  <Input id="call-url" type="url" placeholder="https://cal.com/…" value={form.call_booking_url} onChange={(ev) => set("call_booking_url", ev.target.value)} />
                </Field>
                <ListEditor
                  label="Agenda"
                  items={form.call_agenda}
                  onChange={(v) => set("call_agenda", v)}
                  placeholder="Goals and what success looks like"
                  addLabel="Add agenda item"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-5">
            <Card>
              <CardContent className="pt-7 sm:px-9">
                {form.agreement_source === "pdf" ? (
                  e.document ? (
                    <PdfDocument engagement={e} />
                  ) : (
                    <p className="text-sm text-subtle">Upload your agreement PDF to preview it.</p>
                  )
                ) : (
                  <AgreementDocument engagement={preview} />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-7 sm:px-9">
                <InvoiceDocument engagement={preview} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <StatusTrail
        engagement={e}
        onConfirmPayment={() => run(actions.confirmPayment, "Payment confirmed")}
        confirming={actions.confirmPayment.isPending}
        onCompleteCall={() => run(actions.completeCall, "Marked as held")}
        completing={actions.completeCall.isPending}
      />
    </div>
  );
}

function Locked({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-[10px] border border-warning/30 bg-warning-wash px-4 py-3 text-sm text-warning">
      {children}
    </p>
  );
}

/** What the client has done, with the evidence, and what the admin owes. */
function StatusTrail({
  engagement: e,
  onConfirmPayment,
  confirming,
  onCompleteCall,
  completing,
}: {
  engagement: Engagement;
  onConfirmPayment: () => void;
  confirming: boolean;
  onCompleteCall: () => void;
  completing: boolean;
}) {
  const items: { icon: typeof Send; title: string; done: boolean; body?: React.ReactNode }[] = [
    {
      icon: Send,
      title: "Sent to client",
      done: !!e.sent_at,
      body: e.sent_at && <>{formatDate(e.sent_at)}{e.sender_name ? ` by ${e.sender_name}` : ""}</>,
    },
    {
      icon: FileSignature,
      title: "Agreement signed",
      done: !!e.signed_at,
      body: e.signed_at && (
        <>
          {e.signer_name}
          {e.signer_title ? `, ${e.signer_title}` : ""} · {formatDate(e.signed_at)}
          <span className="mt-1 block break-all font-mono text-[10px] text-faint">
            {e.signer_email} · {e.signer_ip ?? "IP unknown"}
          </span>
        </>
      ),
    },
    {
      icon: CreditCard,
      title: e.paid_at ? "Payment confirmed" : "Payment",
      done: !!e.paid_at,
      body: e.signed_at && (
        <>
          {e.payment_reported_at && (
            <span className="block">
              Client reported {e.payment_method === "stripe" ? "card payment" : "bank transfer"}{" "}
              {formatDate(e.payment_reported_at)}
              {e.payment_reference ? ` · ref ${e.payment_reference}` : ""}
            </span>
          )}
          {e.paid_at && <span className="block">Confirmed {formatDate(e.paid_at)}</span>}
          {!e.paid_at && e.signed_at && (
            <Button size="sm" variant={e.payment_reported_at ? "default" : "outline"} className="mt-2.5" onClick={onConfirmPayment} loading={confirming}>
              Confirm funds received
            </Button>
          )}
        </>
      ),
    },
    {
      icon: Sparkles,
      title: "Welcome pack read",
      done: !!e.welcome_read_at,
      body: e.welcome_read_at && formatDate(e.welcome_read_at),
    },
    {
      icon: CalendarClock,
      title: e.call_completed_at ? "Kickoff call held" : "Kickoff call",
      done: !!e.call_completed_at,
      body: e.call_scheduled_for && (
        <>
          <span className="block">{formatCallTime(e.call_scheduled_for)}</span>
          {e.call_prep_notes && (
            <span className="mt-1.5 block whitespace-pre-line rounded-lg bg-white/[0.04] px-2.5 py-2 text-muted">
              {e.call_prep_notes}
            </span>
          )}
          {!e.call_completed_at && (
            <Button size="sm" variant="outline" className="mt-2.5" onClick={onCompleteCall} loading={completing}>
              Mark as held
            </Button>
          )}
        </>
      ),
    },
  ];

  return (
    <Card className="xl:sticky xl:top-0">
      <div className="border-b border-hairline px-5 py-4">
        <h2 className="text-sm font-semibold tracking-tight text-fg">Progress</h2>
      </div>
      <ol className="px-5 py-4">
        {items.map((item, i) => (
          <li key={item.title} className="relative flex gap-3 pb-5 last:pb-0">
            {i < items.length - 1 && (
              <span className="absolute left-[9px] top-6 h-[calc(100%-12px)] w-px bg-hairline" aria-hidden="true" />
            )}
            {item.done ? (
              <CircleCheck size={19} className="relative shrink-0 text-success" aria-hidden="true" />
            ) : (
              <Circle size={19} className="relative shrink-0 text-faint" aria-hidden="true" />
            )}
            <div className="min-w-0 text-xs text-subtle">
              <p className={cn("text-sm font-medium", item.done ? "text-fg" : "text-muted")}>{item.title}</p>
              {item.body && <div className="mt-1 leading-relaxed">{item.body}</div>}
            </div>
          </li>
        ))}
      </ol>
      {e.sent_at && (
        <div className="flex flex-wrap gap-4 border-t border-hairline px-5 py-3.5">
          <DocumentLink engagement={e} doc="agreement" />
          <DocumentLink engagement={e} doc="invoice" />
        </div>
      )}
    </Card>
  );
}

function SourceToggle({
  value,
  onChange,
}: {
  value: "form" | "pdf";
  onChange: (v: "form" | "pdf") => void;
}) {
  const viewOnly = useReadOnly();
  const options = [
    { key: "pdf" as const, label: "Use my own document", hint: "Upload your agreement as a PDF" },
    { key: "form" as const, label: "Build it here", hint: "Fill in scope, deliverables and terms" },
  ];
  return (
    <div role="radiogroup" aria-label="Agreement source" className="grid gap-3 sm:grid-cols-2">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          disabled={viewOnly}
          onClick={() => onChange(o.key)}
          className={cn(
            "cursor-pointer rounded-[12px] border px-4 py-3 text-left transition-colors disabled:cursor-default",
            value === o.key
              ? "border-brand/50 bg-brand-wash"
              : "border-hairline hover:border-hairline-strong hover:bg-white/[0.03]"
          )}
        >
          <span className="flex items-center gap-2 text-sm font-medium text-fg">
            <span
              className={cn(
                "grid h-4 w-4 place-items-center rounded-full border-2",
                value === o.key ? "border-brand-soft" : "border-hairline-strong"
              )}
              aria-hidden="true"
            >
              {value === o.key && <span className="h-1.5 w-1.5 rounded-full bg-brand-soft" />}
            </span>
            {o.label}
          </span>
          <span className="mt-1 block pl-6 text-xs text-subtle">{o.hint}</span>
        </button>
      ))}
    </div>
  );
}

function AgreementUpload({
  engagement: e,
  onUploaded,
}: {
  engagement: Engagement;
  onUploaded: () => void;
}) {
  const { upload, remove } = useAgreementDocument(e.id);
  const [dragging, setDragging] = useState(false);
  const viewOnly = useReadOnly();
  const locked = !!e.sent_at || viewOnly;

  async function take(file: File | undefined) {
    if (!file) return;
    if (file.type && file.type !== "application/pdf") {
      toast.error("Upload a PDF", { description: "Export your document from Word or Google Docs as PDF." });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("That PDF is over 10 MB");
      return;
    }
    try {
      await upload.mutateAsync(file);
      onUploaded();
      toast.success("Document uploaded");
    } catch (err) {
      toast.error(errorDetail(err, "Couldn't upload that PDF"));
    }
  }

  if (e.document) {
    return (
      <div className="space-y-4">
        <PdfDocument engagement={e} />
        {!locked && (
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-[10px] border border-hairline px-3 text-xs font-medium text-fg transition-colors hover:bg-white/[0.06]">
              <Upload size={13} aria-hidden="true" />
              {upload.isPending ? "Uploading…" : "Replace PDF"}
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                disabled={upload.isPending}
                onChange={(ev) => take(ev.target.files?.[0])}
              />
            </label>
            <Button
              variant="ghost"
              size="sm"
              loading={remove.isPending}
              onClick={() => remove.mutate(undefined, { onError: () => toast.error("Couldn't remove it") })}
            >
              Remove
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (viewOnly) {
    return <p className="text-sm text-subtle">No agreement PDF has been uploaded yet.</p>;
  }

  return (
    <label
      onDragOver={(ev) => {
        ev.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(ev) => {
        ev.preventDefault();
        setDragging(false);
        take(ev.dataTransfer.files?.[0]);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-[14px] border-2 border-dashed px-6 py-12 text-center transition-colors",
        dragging ? "border-brand-soft bg-brand-wash" : "border-hairline-strong hover:border-brand-soft/50 hover:bg-white/[0.03]"
      )}
    >
      {upload.isPending ? (
        <Loader2 size={22} className="animate-spin text-brand-soft" aria-hidden="true" />
      ) : (
        <Upload size={22} className="text-brand-soft" aria-hidden="true" />
      )}
      <span className="mt-4 text-sm font-medium text-fg">
        {upload.isPending ? "Uploading…" : "Drop your agreement PDF here, or click to choose"}
      </span>
      <span className="mt-1.5 text-xs text-subtle">
        Export it from Word or Google Docs as PDF · up to 10 MB · no password
      </span>
      <input
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        disabled={upload.isPending}
        onChange={(ev) => take(ev.target.files?.[0])}
      />
    </label>
  );
}
