"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  PenLine, CreditCard, Landmark, Copy, Check, ExternalLink, Download,
  CircleCheck, Mail, Phone, MessagesSquare, Clock, CalendarClock, Hourglass,
  ArrowRight, Lock, FolderOpen, Rocket, MessageSquareText, Milestone as MilestoneIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { StatusPill, MILESTONE_STATUS } from "@/components/ui/status-pill";
import { AgreementDocument, Prose } from "@/components/onboarding/AgreementDocument";
import { InvoiceDocument } from "@/components/onboarding/InvoiceDocument";
import { useEngagementAction, errorDetail, downloadPdf } from "@/hooks/useEngagements";
import { PdfDocument } from "@/components/onboarding/PdfDocument";
import { useMilestones } from "@/hooks/useProjects";
import { useCurrentUser } from "@/hooks/useAuth";
import { signatureFont } from "@/lib/fonts";
import { formatMoney } from "@/lib/money";
import { cn, formatDate, parseApiDate } from "@/lib/utils";
import type { Engagement } from "@/lib/types";
import type { Step, StepKey } from "@/components/onboarding/steps";

type Go = (key: StepKey) => void;

// A link styled as the primary button. An <a> wrapping a <button> is invalid
// HTML and gives keyboard users two tab stops for one action.
const LINK_BUTTON =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-brand px-6 text-sm " +
  "font-medium text-white transition-colors duration-200 hover:bg-brand-hover glow-brand";

export function DocumentLink({ engagement: e, doc }: { engagement: Engagement; doc: "agreement" | "invoice" }) {
  const cls =
    "inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-subtle transition-colors hover:text-brand-soft";

  // An uploaded agreement is its own PDF: hand over the file itself — with
  // the signature certificate once signed — rather than re-rendering it.
  if (doc === "agreement" && e.agreement_source === "pdf") {
    const path = `/engagements/${e.id}/document${e.signed_at ? "/signed" : ""}`;
    const stem = (e.document?.filename ?? "agreement.pdf").replace(/\.pdf$/i, "");
    const name = e.signed_at ? `${stem} (signed).pdf` : `${stem}.pdf`;
    return (
      <button
        type="button"
        className={cls}
        onClick={() => downloadPdf(path, name).catch(() => toast.error("Couldn't download the document"))}
      >
        <Download size={13} aria-hidden="true" />
        {e.signed_at ? "Download signed copy" : "Download PDF"}
      </button>
    );
  }

  return (
    <Link href={`/documents/${e.id}/${doc}`} target="_blank" className={cls}>
      <Download size={13} aria-hidden="true" />
      Download PDF
    </Link>
  );
}

// ── 1. Agreement ─────────────────────────────────────────────────────────────

export function AgreementPanel({ engagement: e, go }: { engagement: Engagement; go: Go }) {
  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="pt-7 sm:px-9 sm:pt-9">
          {e.agreement_source === "pdf" ? (
            <>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand-soft">
                Agreement · please read before signing
              </p>
              <h2 className="mb-5 mt-3 text-2xl font-semibold tracking-tight text-fg">
                {e.agreement_title}
              </h2>
              <PdfDocument engagement={e} />
            </>
          ) : (
            <AgreementDocument engagement={e} />
          )}
        </CardContent>
      </Card>
      {e.signed_at ? (
        <Card className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
          <p className="flex items-center gap-2 text-sm text-fg">
            <CircleCheck size={16} className="text-success" aria-hidden="true" />
            Signed {formatDate(e.signed_at)} by {e.signer_name}
          </p>
          <div className="flex items-center gap-4">
            <DocumentLink engagement={e} doc="agreement" />
            {!e.payment_reported_at && !e.paid_at && (
              <Button size="sm" onClick={() => go("invoice")}>
                Continue to invoice
                <ArrowRight size={13} aria-hidden="true" />
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <SignPanel engagement={e} go={go} />
      )}
    </div>
  );
}

function SignPanel({ engagement: e, go }: { engagement: Engagement; go: Go }) {
  const { data: user } = useCurrentUser();
  const { sign } = useEngagementAction(e.id);
  const [name, setName] = useState(user?.full_name ?? "");
  const [title, setTitle] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (name.trim().length < 2) {
      setError("Type your full legal name to sign.");
      return;
    }
    try {
      await sign.mutateAsync({
        signer_name: name.trim(),
        signer_title: title.trim() || undefined,
        agreement_hash: e.agreement_hash!,
        consent,
      });
      toast.success("Agreement signed", { description: "Your invoice is ready." });
      go("invoice");
    } catch (err) {
      toast.error(errorDetail(err, "Couldn't sign the agreement"));
    }
  }

  return (
    <Card className="border-brand/30">
      <form onSubmit={submit} noValidate className="space-y-5 px-6 py-6 sm:px-9">
        <div className="flex items-center gap-2.5">
          <PenLine size={16} className="text-brand-soft" aria-hidden="true" />
          <h2 className="text-base font-semibold tracking-tight text-fg">Sign this agreement</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full legal name" htmlFor="sign-name" required error={error}>
            <Input
              id="sign-name"
              autoComplete="name"
              value={name}
              onChange={(ev) => {
                setName(ev.target.value);
                setError(null);
              }}
              aria-invalid={!!error}
            />
          </Field>
          <Field label="Title" htmlFor="sign-title" hint="Optional — e.g. Founder, Director">
            <Input
              id="sign-title"
              autoComplete="organization-title"
              value={title}
              onChange={(ev) => setTitle(ev.target.value)}
            />
          </Field>
        </div>

        {/* Live preview: seeing the name as a signature makes the act feel real */}
        <div
          className="flex h-20 items-end rounded-[10px] border border-dashed border-hairline-strong bg-white/[0.03] px-5 pb-3"
          aria-hidden="true"
        >
          <span
            className={cn(
              signatureFont.className,
              "text-4xl leading-none",
              name.trim() ? "text-fg" : "text-faint"
            )}
          >
            {name.trim() || "Your signature"}
          </span>
        </div>

        <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-muted">
          <input
            type="checkbox"
            checked={consent}
            onChange={(ev) => setConsent(ev.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[var(--brand)]"
          />
          <span>
            I have read this agreement, I am authorised to sign it on behalf of{" "}
            <span className="text-fg">{e.organization_name}</span>, and I agree that typing
            my name above is my electronic signature.
          </span>
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-5">
          <p className="text-xs text-faint">
            We record the time, your account email and IP address with your signature.
          </p>
          <Button type="submit" size="lg" loading={sign.isPending} disabled={!consent}>
            {!sign.isPending && <PenLine size={15} aria-hidden="true" />}
            Sign agreement
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ── 2. Invoice ───────────────────────────────────────────────────────────────

export function InvoicePanel({ engagement: e, go }: { engagement: Engagement; go: Go }) {
  const paid = !!(e.payment_reported_at || e.paid_at);

  // Sized by the panel, not the viewport: beside the sidebar and step list the
  // column is far narrower than the window, and a table squeezed next to the
  // pay card clips its amounts. Stacked, paying comes first — it's the action.
  return (
    <div className="@container">
      <div className="grid gap-5 @4xl:grid-cols-[1fr_340px] @4xl:items-start">
        <Card className="order-2 @4xl:order-none">
          <CardContent className="pt-7 sm:px-8">
            <InvoiceDocument engagement={e} showPaymentDetails={false} />
            <div className="mt-6 border-t border-hairline pt-4">
              <DocumentLink engagement={e} doc="invoice" />
            </div>
          </CardContent>
        </Card>

        <div className="order-1 @4xl:order-none">
          {paid ? <PaidCard engagement={e} go={go} /> : <PayCard engagement={e} go={go} />}
        </div>
      </div>
    </div>
  );
}

function PaidCard({ engagement: e, go }: { engagement: Engagement; go: Go }) {
  return (
    <Card className="px-6 py-6">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-success-wash text-success">
        <CircleCheck size={20} aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold tracking-tight text-fg">
        {e.paid_at ? "Payment received" : "Thank you — payment sent"}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-subtle">
        {e.paid_at
          ? `Confirmed on ${formatDate(e.paid_at)}.`
          : "We'll confirm as soon as it lands. Nothing else needed from you here."}
      </p>
      <Button className="mt-5 w-full" onClick={() => go("launch")}>
        See what happens next
        <ArrowRight size={14} aria-hidden="true" />
      </Button>
    </Card>
  );
}

function PayCard({ engagement: e, go }: { engagement: Engagement; go: Go }) {
  const { reportPayment } = useEngagementAction(e.id);
  const [method, setMethod] = useState<"stripe" | "bank">(e.stripe_payment_url ? "stripe" : "bank");
  const [reference, setReference] = useState("");
  const [copied, setCopied] = useState(false);

  async function report() {
    try {
      await reportPayment.mutateAsync({ method, reference: reference.trim() || undefined });
      toast.success("Thank you!", { description: "Your project is officially underway." });
      go("launch");
    } catch (err) {
      toast.error(errorDetail(err, "Couldn't record your payment"));
    }
  }

  async function copyBank() {
    try {
      await navigator.clipboard.writeText(`${e.bank_details}\nReference: ${e.invoice_number}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.info("Select the details and copy them manually");
    }
  }

  const options = [
    e.stripe_payment_url && { key: "stripe" as const, label: "Card", icon: CreditCard },
    e.bank_details && { key: "bank" as const, label: "Bank transfer", icon: Landmark },
  ].filter(Boolean) as { key: "stripe" | "bank"; label: string; icon: typeof CreditCard }[];

  return (
    <Card className="border-brand/30">
      <div className="px-6 pt-6">
        <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Amount due</p>
        <p className="tabular mt-1.5 text-3xl font-semibold tracking-tight text-fg">
          {formatMoney(e.invoice_total, e.currency)}
        </p>
      </div>

      {options.length > 1 && (
        <div role="radiogroup" aria-label="Payment method" className="mx-6 mt-5 grid grid-cols-2 gap-1 rounded-full border border-hairline p-1">
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={method === o.key}
              onClick={() => setMethod(o.key)}
              className={cn(
                "flex cursor-pointer items-center justify-center gap-1.5 rounded-full py-2 text-xs font-medium transition-colors",
                method === o.key ? "bg-brand text-white" : "text-subtle hover:text-fg"
              )}
            >
              <o.icon size={13} aria-hidden="true" />
              {o.label}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-4 px-6 py-5">
        {method === "stripe" && e.stripe_payment_url ? (
          <>
            <p className="text-sm leading-relaxed text-subtle">
              Pay securely by card, Apple Pay or Google Pay through Stripe. It opens in a new tab.
            </p>
            <a href={e.stripe_payment_url} target="_blank" rel="noopener noreferrer" className={LINK_BUTTON}>
              Pay {formatMoney(e.invoice_total, e.currency)}
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          </>
        ) : (
          <>
            <div className="relative rounded-[10px] border border-hairline bg-white/[0.03] p-4">
              <p className="whitespace-pre-line pr-8 font-mono text-xs leading-relaxed text-fg">
                {e.bank_details}
              </p>
              <p className="mt-3 text-xs text-subtle">
                Reference: <span className="font-mono text-fg">{e.invoice_number}</span>
              </p>
              <button
                type="button"
                onClick={copyBank}
                aria-label="Copy bank details"
                className="absolute right-2 top-2 grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-faint transition-colors hover:bg-white/[0.06] hover:text-fg"
              >
                {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
              </button>
            </div>
            <Field label="Transfer reference" htmlFor="pay-ref" hint="Optional — helps us match it faster">
              <Input id="pay-ref" value={reference} onChange={(ev) => setReference(ev.target.value)} />
            </Field>
          </>
        )}
      </div>

      <div className="border-t border-hairline px-6 py-5">
        <Button
          variant={method === "stripe" ? "outline" : "default"}
          className="w-full"
          loading={reportPayment.isPending}
          onClick={report}
        >
          {!reportPayment.isPending && <CircleCheck size={14} aria-hidden="true" />}
          {method === "stripe" ? "I've completed payment" : "I've sent the transfer"}
        </Button>
        <p className="mt-3 text-center text-xs text-faint">
          Your welcome pack and kickoff booking open straight away.
        </p>
      </div>
    </Card>
  );
}

// ── 3. Welcome ───────────────────────────────────────────────────────────────

export function WelcomePanel({ engagement: e, go }: { engagement: Engagement; go: Go }) {
  const { markWelcomeRead } = useEngagementAction(e.id);
  const contacts = [
    e.contact_email && { icon: Mail, label: "Email", value: e.contact_email, href: `mailto:${e.contact_email}` },
    e.contact_phone && { icon: Phone, label: "Phone", value: e.contact_phone, href: `tel:${e.contact_phone}` },
    e.contact_channel && { icon: MessagesSquare, label: "Day-to-day", value: e.contact_channel },
    e.response_time && { icon: Hourglass, label: "Response time", value: e.response_time },
    e.working_hours && { icon: Clock, label: "Working hours", value: e.working_hours },
  ].filter(Boolean) as { icon: typeof Mail; label: string; value: string; href?: string }[];

  return (
    <div className="space-y-5">
      <Card className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand/25 blur-[90px]"
          aria-hidden="true"
        />
        <CardContent className="relative pt-7 sm:px-9 sm:pt-9">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand-soft">Welcome aboard</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-fg">
            {e.organization_name}, let&apos;s build {e.project_name}.
          </h2>
          <Prose
            text={e.welcome_message ?? "We're delighted to be working with you. Here's everything you need for the weeks ahead."}
            className="mt-4 max-w-2xl text-sm leading-relaxed text-muted"
          />
        </CardContent>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        {/* An uploaded agreement leaves these fields empty; skip the card then. */}
        {(e.scope || !!e.deliverables?.length) && (
        <Card className="px-6 py-6">
          <h3 className="text-sm font-semibold tracking-tight text-fg">Project overview</h3>
          {e.scope && <Prose text={e.scope} className="mt-3 text-sm leading-relaxed text-subtle" />}
          {!!e.deliverables?.length && (
            <ul className="mt-4 space-y-2">
              {e.deliverables.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted">
                  <CircleCheck size={14} className="mt-0.5 shrink-0 text-brand-soft" aria-hidden="true" />
                  {d.title}
                </li>
              ))}
            </ul>
          )}
        </Card>
        )}

        <Card className="px-6 py-6">
          <h3 className="text-sm font-semibold tracking-tight text-fg">How we&apos;ll work together</h3>
          {contacts.length ? (
            <dl className="mt-4 space-y-3.5">
              {contacts.map((c) => (
                <div key={c.label} className="flex items-start gap-3">
                  <c.icon size={15} className="mt-0.5 shrink-0 text-faint" aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="text-xs text-faint">{c.label}</dt>
                    <dd className="text-sm text-fg">
                      {c.href ? (
                        <a href={c.href} className="break-all transition-colors hover:text-brand-soft">
                          {c.value}
                        </a>
                      ) : (
                        c.value
                      )}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-3 text-sm text-subtle">
              Leave a remark on anything in your portal — it comes straight to us.
            </p>
          )}
        </Card>
      </div>

      <NextStepsCard engagement={e} />

      <Card className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <p className="text-sm text-subtle">
          {e.welcome_read_at ? "You've read your welcome pack." : "All clear? Mark it read and book your kickoff."}
        </p>
        <Button
          loading={markWelcomeRead.isPending}
          onClick={async () => {
            if (!e.welcome_read_at) {
              try {
                await markWelcomeRead.mutateAsync();
              } catch (err) {
                toast.error(errorDetail(err, "Couldn't save that"));
                return;
              }
            }
            go(e.call_scheduled_for ? "launch" : "call");
          }}
        >
          {e.call_scheduled_for ? "Back to overview" : "Book the kickoff call"}
          <ArrowRight size={14} aria-hidden="true" />
        </Button>
      </Card>
    </div>
  );
}

function NextStepsCard({ engagement: e }: { engagement: Engagement }) {
  if (!e.next_steps?.length) return null;
  return (
    <Card className="px-6 py-6">
      <h3 className="text-sm font-semibold tracking-tight text-fg">What happens next</h3>
      <ol className="mt-4 space-y-3">
        {e.next_steps.map((s, i) => (
          <li key={i} className="flex gap-3.5 text-sm text-muted">
            <span className="tabular grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-wash font-mono text-[11px] text-brand-soft">
              {i + 1}
            </span>
            <span className="pt-0.5">{s}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

// ── 4. Portal ────────────────────────────────────────────────────────────────

export function PortalPanel({ engagement: e }: { engagement: Engagement }) {
  const features = [
    { icon: MilestoneIcon, title: "Live timeline", body: "Every milestone — done, in progress and still ahead." },
    { icon: MessageSquareText, title: "Remarks anywhere", body: "Comment on the project, a milestone, an update or a file." },
    { icon: FolderOpen, title: "Requests", body: "Ask for a change or report an issue, and follow it to done." },
  ];
  return (
    <Card className="px-6 py-7 sm:px-9">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-success-wash text-success">
        <CircleCheck size={20} aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-xl font-semibold tracking-tight text-fg">You&apos;re already in</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-subtle">
        This portal is where {e.project_name} lives from now on. Bookmark it — no more digging
        through email threads for the latest status.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="rounded-[10px] border border-hairline p-4">
            <f.icon size={16} className="text-brand-soft" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-fg">{f.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-subtle">{f.body}</p>
          </div>
        ))}
      </div>
      <Link href={`/projects/${e.project_id}`} className="mt-6 inline-block">
        <Button variant="outline">
          Open {e.project_name}
          <ArrowRight size={14} aria-hidden="true" />
        </Button>
      </Link>
    </Card>
  );
}

// ── 5. Kickoff call ──────────────────────────────────────────────────────────

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  // Shown in the viewer's zone for editing.
  const d = parseApiDate(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatCallTime(iso: string): string {
  const d = parseApiDate(iso);
  return d.toLocaleString(undefined, {
    weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit",
  });
}

export function CallPanel({ engagement: e, go }: { engagement: Engagement; go: Go }) {
  const { scheduleCall } = useEngagementAction(e.id);
  const [when, setWhen] = useState(toLocalInput(e.call_scheduled_for));
  const [notes, setNotes] = useState(e.call_prep_notes ?? "");
  const [editing, setEditing] = useState(!e.call_scheduled_for);
  const [error, setError] = useState<string | null>(null);

  async function save(ev: React.FormEvent) {
    ev.preventDefault();
    if (!when) {
      setError("Pick the date and time you booked.");
      return;
    }
    try {
      await scheduleCall.mutateAsync({
        scheduled_for: new Date(when).toISOString(),
        prep_notes: notes,
      });
      toast.success("Kickoff call saved", { description: "We'll see you there." });
      setEditing(false);
      go("launch");
    } catch (err) {
      toast.error(errorDetail(err, "Couldn't save the call"));
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-start">
      <Card className="px-6 py-7 sm:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand-soft">Kickoff strategy call</p>
        <h2 className="mt-3 text-xl font-semibold tracking-tight text-fg">Let&apos;s align before we build</h2>
        <p className="mt-2 text-sm leading-relaxed text-subtle">
          About an hour together to agree on what matters most, so the first thing we deliver is
          already pointed in the right direction.
        </p>
        {!!e.call_agenda?.length && (
          <>
            <h3 className="mt-6 text-sm font-semibold text-fg">Agenda</h3>
            <ul className="mt-3 space-y-2.5">
              {e.call_agenda.map((a, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-muted">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-soft" aria-hidden="true" />
                  {a}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Card className={cn(!e.call_scheduled_for && "border-brand/30")}>
        {e.call_scheduled_for && !editing ? (
          <div className="px-6 py-6">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-success-wash text-success">
              <CalendarClock size={20} aria-hidden="true" />
            </span>
            <p className="mt-4 text-xs text-faint">{e.call_completed_at ? "Held" : "Booked for"}</p>
            <p className="mt-1 text-base font-semibold text-fg">{formatCallTime(e.call_scheduled_for)}</p>
            {e.call_prep_notes && (
              <p className="mt-3 whitespace-pre-line text-sm text-subtle">{e.call_prep_notes}</p>
            )}
            {!e.call_completed_at && (
              <Button variant="ghost" size="sm" className="mt-4 -ml-3" onClick={() => setEditing(true)}>
                Change time or notes
              </Button>
            )}
          </div>
        ) : (
          <form onSubmit={save} noValidate className="space-y-4 px-6 py-6">
            {e.call_booking_url && (
              <div>
                <p className="text-sm font-medium text-fg">1. Pick a time</p>
                <a href={e.call_booking_url} target="_blank" rel="noopener noreferrer" className={cn(LINK_BUTTON, "mt-2.5")}>
                  Open the booking calendar
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              </div>
            )}
            <p className="text-sm font-medium text-fg">
              {e.call_booking_url ? "2. Tell us when you booked" : "When suits you?"}
            </p>
            <Field label="Date & time" htmlFor="call-when" required error={error}>
              <Input
                id="call-when"
                type="datetime-local"
                value={when}
                onChange={(ev) => {
                  setWhen(ev.target.value);
                  setError(null);
                }}
                aria-invalid={!!error}
              />
            </Field>
            <Field
              label="Anything we should know beforehand?"
              htmlFor="call-notes"
              hint="Goals, references, people who'll join — whatever is on your mind."
            >
              <Textarea id="call-notes" value={notes} onChange={(ev) => setNotes(ev.target.value)} />
            </Field>
            <Button type="submit" variant={e.call_booking_url ? "outline" : "default"} className="w-full" loading={scheduleCall.isPending}>
              Save my kickoff call
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}

// ── 6. Launch ────────────────────────────────────────────────────────────────

/**
 * The first screen after paying. Buyer's remorse feeds on silence, so this
 * answers "what did I just buy?" at once: steps already ticked off, the real
 * project timeline, and the one or two things left to do.
 */
export function LaunchPanel({
  engagement: e,
  steps,
  go,
}: {
  engagement: Engagement;
  steps: Step[];
  go: Go;
}) {
  const { data: milestones = [] } = useMilestones(e.project_id);
  const remaining = steps.filter((s) => s.state === "todo" && s.key !== "launch");

  return (
    <div className="space-y-5">
      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-16 -top-24 h-72 w-72 rounded-full bg-brand/30 blur-[100px]" aria-hidden="true" />
        <CardContent className="relative pt-8 sm:px-9 sm:pt-10">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand text-white glow-brand">
            <Rocket size={22} aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight text-fg">
            {e.project_name} is officially underway
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-subtle">
            Your agreement is signed and your payment is in. From here, everything we do shows up
            in this portal as it happens.
          </p>

          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {steps.filter((s) => s.key !== "launch").map((s) => (
              <li key={s.key}>
                <button
                  type="button"
                  onClick={() => go(s.key)}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-sm transition-colors hover:bg-white/[0.05]"
                >
                  {s.state === "done" ? (
                    <CircleCheck size={16} className="shrink-0 text-success" aria-hidden="true" />
                  ) : (
                    <span className="h-4 w-4 shrink-0 rounded-full border-2 border-brand-soft" aria-hidden="true" />
                  )}
                  <span className={s.state === "done" ? "text-subtle" : "font-medium text-fg"}>{s.label}</span>
                  <span className="sr-only">{s.state === "done" ? "(done)" : "(to do)"}</span>
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {remaining.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {remaining.map((s) => (
            <Card key={s.key} interactive className="border-brand/30 px-5 py-5" onClick={() => go(s.key)}>
              <div className="flex items-start justify-between gap-3">
                <s.icon size={18} className="text-brand-soft" aria-hidden="true" />
                <ArrowRight size={15} className="text-faint" aria-hidden="true" />
              </div>
              <p className="mt-4 text-sm font-semibold text-fg">{s.label}</p>
              <p className="mt-1 text-xs text-subtle">{s.hint}</p>
            </Card>
          ))}
        </div>
      )}

      {e.call_scheduled_for && (
        <Card className="flex items-center gap-4 px-6 py-4">
          <CalendarClock size={18} className="shrink-0 text-brand-soft" aria-hidden="true" />
          <p className="text-sm text-muted">
            Kickoff call: <span className="font-medium text-fg">{formatCallTime(e.call_scheduled_for)}</span>
          </p>
        </Card>
      )}

      <Card className="px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold tracking-tight text-fg">Your project timeline</h3>
          <Link href={`/projects/${e.project_id}`} className="text-xs font-medium text-brand-soft hover:underline">
            Open project
          </Link>
        </div>
        {milestones.length ? (
          <ol className="mt-5 space-y-0">
            {milestones.map((m, i) => (
              <li key={m.id} className="relative flex gap-4 pb-5 last:pb-0">
                {i < milestones.length - 1 && (
                  <span className="absolute left-[7px] top-5 h-full w-px bg-hairline" aria-hidden="true" />
                )}
                <span
                  className={cn(
                    "relative mt-1 h-[15px] w-[15px] shrink-0 rounded-full border-2",
                    m.status === "completed" ? "border-success bg-success" : m.status === "in_progress" ? "border-brand-soft bg-brand-wash" : "border-hairline-strong"
                  )}
                  aria-hidden="true"
                />
                <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-fg">{m.title}</p>
                    {m.due_date && <p className="text-xs text-faint">Target {formatDate(m.due_date)}</p>}
                  </div>
                  <StatusPill descriptor={MILESTONE_STATUS[m.status]} size="sm" />
                </div>
              </li>
            ))}
          </ol>
        ) : e.timeline?.length ? (
          <ol className="mt-5 space-y-3">
            {e.timeline.map((t, i) => (
              <li key={i} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-3 text-fg">
                  <span className="tabular font-mono text-xs text-faint">{String(i + 1).padStart(2, "0")}</span>
                  {t.phase}
                </span>
                <span className="text-subtle">{t.duration}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-subtle">Milestones appear here as soon as we map them out.</p>
        )}
      </Card>

      <NextStepsCard engagement={e} />
    </div>
  );
}

export function LockedPanel({ step, current, go }: { step: Step; current: StepKey; go: Go }) {
  return (
    <Card className="px-6 py-14 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.06] text-faint">
        <Lock size={20} aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-base font-semibold tracking-tight text-fg">{step.label}</h2>
      <p className="mt-1.5 text-sm text-subtle">{step.lockedReason}</p>
      <Button variant="outline" className="mt-6" onClick={() => go(current)}>
        Go to the current step
      </Button>
    </Card>
  );
}
