import { cn, formatDate } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { Prose } from "@/components/onboarding/AgreementDocument";
import type { Engagement } from "@/lib/types";

export function invoiceStatus(e: Engagement): { label: string; tone: "success" | "warning" | "muted" } {
  if (e.paid_at) return { label: "Paid", tone: "success" };
  if (e.payment_reported_at) return { label: "Payment sent — confirming", tone: "warning" };
  return { label: "Due", tone: "muted" };
}

export function InvoiceDocument({
  engagement: e,
  className,
  showPaymentDetails = true,
}: {
  engagement: Engagement;
  className?: string;
  /** Bank details belong on the PDF, but the pay panel shows them itself. */
  showPaymentDetails?: boolean;
}) {
  const status = invoiceStatus(e);
  const items = e.line_items ?? [];

  return (
    <article className={cn("space-y-8 text-sm text-muted", className)}>
      <header className="flex flex-wrap items-start justify-between gap-5 border-b border-hairline pb-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand-soft">
            Invoice
          </p>
          <h1 className="tabular mt-3 text-2xl font-semibold tracking-tight text-fg">
            {e.invoice_number ?? "—"}
          </h1>
          <p className="mt-1.5 text-subtle">{e.project_name}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            status.tone === "success" && "bg-success-wash text-success",
            status.tone === "warning" && "bg-warning-wash text-warning",
            status.tone === "muted" && "border border-hairline text-muted"
          )}
        >
          {status.label}
        </span>
      </header>

      <dl className="grid gap-5 sm:grid-cols-3">
        <Meta label="Billed to" value={e.organization_name ?? "—"} />
        <Meta label="Issued" value={formatDate(e.sent_at ?? e.created_at)} />
        <Meta label="Due" value={e.invoice_due_date ? formatDate(e.invoice_due_date) : "On receipt"} />
      </dl>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-left">
          <thead>
            <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-wider text-faint">
              <th className="pb-2.5 font-normal">Description</th>
              <th className="pb-2.5 pl-4 text-right font-normal">Qty</th>
              <th className="pb-2.5 pl-4 text-right font-normal">Rate</th>
              <th className="pb-2.5 pl-4 text-right font-normal">Amount</th>
            </tr>
          </thead>
          <tbody className="tabular">
            {items.map((item, i) => (
              <tr key={i} className="border-b border-hairline">
                <td className="py-3 pr-4 text-fg">{item.description}</td>
                <td className="py-3 pl-4 text-right">{item.quantity}</td>
                <td className="whitespace-nowrap py-3 pl-4 text-right">{formatMoney(item.unit_amount, e.currency)}</td>
                <td className="whitespace-nowrap py-3 pl-4 text-right text-fg">
                  {formatMoney(item.quantity * item.unit_amount, e.currency)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="pr-4 pt-4 text-right font-medium text-fg">
                Total due
              </td>
              <td className="tabular whitespace-nowrap pt-4 text-right text-lg font-semibold text-fg">
                {formatMoney(e.invoice_total, e.currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {e.invoice_notes && <Prose text={e.invoice_notes} className="text-subtle" />}

      {showPaymentDetails && e.bank_details && (
        <section className="rounded-[10px] border border-hairline p-4">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-faint">
            Bank transfer
          </p>
          <p className="whitespace-pre-line font-mono text-xs text-fg">{e.bank_details}</p>
          <p className="mt-3 text-xs text-subtle">
            Use <span className="text-fg">{e.invoice_number}</span> as the payment reference.
          </p>
        </section>
      )}
    </article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-wider text-faint">{label}</dt>
      <dd className="mt-1 font-medium text-fg">{value}</dd>
    </div>
  );
}
