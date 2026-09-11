import { cn, formatDate, parseApiDate } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { signatureFont } from "@/lib/fonts";
import type { Engagement } from "@/lib/types";

/**
 * The agreement as the client reads and signs it.
 *
 * Pure rendering, shared by the client's signing view, the admin preview and
 * the printable PDF — so what is signed, what the admin checked and what gets
 * filed are the same markup.
 */
export function AgreementDocument({
  engagement: e,
  className,
}: {
  engagement: Engagement;
  className?: string;
}) {
  const issued = e.sent_at ?? e.created_at;

  return (
    <article className={cn("space-y-9 text-sm leading-relaxed text-muted", className)}>
      <header className="border-b border-hairline pb-7">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand-soft">
          Agreement · {formatDate(issued)}
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-fg">
          {e.agreement_title}
        </h1>
        <p className="mt-2 text-subtle">{e.project_name}</p>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <Party label="Provider" name="Enigma-Cube" />
          <Party label="Client" name={e.organization_name ?? "—"} />
        </dl>
      </header>

      <Section n="01" title="Scope of work">
        <Prose text={e.scope} />
      </Section>

      <Section n="02" title="Deliverables">
        {e.deliverables?.length ? (
          <ol className="space-y-3">
            {e.deliverables.map((d, i) => (
              <li key={i} className="flex gap-3">
                <span className="tabular mt-px font-mono text-xs text-faint">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="font-medium text-fg">{d.title}</p>
                  {d.detail && <p className="mt-0.5 text-subtle">{d.detail}</p>}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <Missing />
        )}
      </Section>

      <Section n="03" title="Timeline">
        {e.timeline?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <tbody>
                {e.timeline.map((t, i) => (
                  <tr key={i} className="border-b border-hairline last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-fg">{t.phase}</td>
                    <td className="py-2.5 text-right text-subtle">{t.duration ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Missing />
        )}
      </Section>

      <Section n="04" title="Revision policy">
        <Prose text={e.revision_policy} />
      </Section>

      <Section n="05" title="Fees & payment">
        <p>
          Project fee:{" "}
          <span className="tabular font-semibold text-fg">
            {formatMoney(e.invoice_total, e.currency)}
          </span>
          {e.invoice_number && <span className="text-subtle"> — invoice {e.invoice_number}</span>}
        </p>
        {e.payment_terms && <Prose text={e.payment_terms} className="mt-3" />}
      </Section>

      {e.additional_terms && (
        <Section n="06" title="Terms">
          <Prose text={e.additional_terms} />
        </Section>
      )}

      <section className="grid gap-5 border-t border-hairline pt-8 sm:grid-cols-2">
        <SignatureBlock
          role="For Enigma-Cube"
          name={e.sender_name}
          date={e.sent_at}
          pending="Issued on sending"
        />
        <SignatureBlock
          role={`For ${e.organization_name ?? "the client"}`}
          name={e.signer_name}
          title={e.signer_title}
          date={e.signed_at}
          pending="Awaiting signature"
        />
      </section>

      {e.agreement_hash && (
        <footer className="border-t border-hairline pt-5 font-mono text-[10px] leading-relaxed text-faint">
          <p className="break-all">Document fingerprint (SHA-256) · {e.agreement_hash}</p>
          {e.signed_at && (
            <p className="mt-1">
              Signed electronically by {e.signer_email}
              {e.signer_ip ? ` from ${e.signer_ip}` : ""} on{" "}
              {parseApiDate(e.signed_at).toUTCString()}
            </p>
          )}
        </footer>
      )}
    </article>
  );
}

function Party({ label, name }: { label: string; name: string }) {
  return (
    <div className="rounded-[10px] border border-hairline px-4 py-3">
      <dt className="font-mono text-[10px] uppercase tracking-wider text-faint">{label}</dt>
      <dd className="mt-1 font-medium text-fg">{name}</dd>
    </div>
  );
}

function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-baseline gap-3 text-base font-semibold tracking-tight text-fg">
        <span className="font-mono text-[11px] font-normal text-brand-soft">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Prose({ text, className }: { text: string | null; className?: string }) {
  if (!text?.trim()) return <Missing />;
  // Authored as plain text; keep the admin's paragraph breaks.
  return <p className={cn("whitespace-pre-line", className)}>{text}</p>;
}

function Missing() {
  return <p className="italic text-faint">Not yet written.</p>;
}

function SignatureBlock({
  role,
  name,
  title,
  date,
  pending,
}: {
  role: string;
  name: string | null;
  title?: string | null;
  date: string | null;
  pending: string;
}) {
  const signed = !!(name && date);
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-faint">{role}</p>
      <div className="mt-2 flex h-16 items-end border-b border-hairline-strong pb-1.5">
        {signed ? (
          <span className={cn(signatureFont.className, "text-4xl leading-none text-fg")}>
            {name}
          </span>
        ) : (
          <span className="text-xs italic text-faint">{pending}</span>
        )}
      </div>
      {signed && (
        <p className="mt-2 text-xs text-subtle">
          {name}
          {title ? `, ${title}` : ""} · {formatDate(date)}
        </p>
      )}
    </div>
  );
}
