"use client";
import { use } from "react";
import { notFound } from "next/navigation";
import { Printer } from "lucide-react";
import { useCurrentUser } from "@/hooks/useAuth";
import { useEngagement, openPdf } from "@/hooks/useEngagements";
import { useLetterhead } from "@/hooks/useBranding";
import { cn } from "@/lib/utils";
import { PageLoader } from "@/components/shared/PageLoader";
import { CubeLogo } from "@/components/shared/BrandMark";
import { AgreementDocument } from "@/components/onboarding/AgreementDocument";
import { InvoiceDocument } from "@/components/onboarding/InvoiceDocument";
import { LetterheadPage, LetterheadRunningHeader } from "@/components/onboarding/Letterhead";

/**
 * A document on white, for saving as PDF or printing.
 *
 * The browser's own "Save as PDF" produces a real, text-selectable PDF from
 * the same markup the client signed - no server-side renderer to keep in step
 * with the on-screen version.
 */
export default function DocumentPage({
  params,
}: {
  params: Promise<{ id: string; doc: string }>;
}) {
  const { id, doc } = use(params);
  if (doc !== "agreement" && doc !== "invoice") notFound();

  const { data: user } = useCurrentUser();
  const { data: e, isLoading, isError } = useEngagement(id, !!user);
  // Above the early returns below - hooks cannot be called conditionally.
  // A sent agreement asks for the stationery it was pinned to; a draft has no
  // pin and falls through to whatever is current.
  const letterhead = useLetterhead(e?.letterhead_sha256, !!e);

  if (!user || isLoading) return <PageLoader label="Preparing document" />;
  if (isError || !e) {
    return (
      <main className="grid min-h-dvh place-items-center px-4 text-sm text-subtle">
        This document isn&apos;t available.
      </main>
    );
  }

  // An uploaded agreement is already a PDF; hand that over instead of a re-render.
  if (doc === "agreement" && e.agreement_source === "pdf") {
    const path = `/engagements/${e.id}/document${e.signed_at ? "/signed" : ""}`;
    return (
      <main className="grid min-h-dvh place-items-center px-4">
        <div className="max-w-sm text-center">
          <p className="text-sm text-subtle">
            {e.agreement_title} is an uploaded PDF
            {e.signed_at ? ", signed with a certificate page attached." : "."}
          </p>
          <button
            type="button"
            onClick={() => openPdf(path).catch(() => undefined)}
            className="mt-5 inline-flex h-10 cursor-pointer items-center gap-2 rounded-[10px] bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
          >
            <Printer size={15} aria-hidden="true" />
            {e.signed_at ? "Open signed copy" : "Open PDF"}
          </button>
        </div>
      </main>
    );
  }

  const title = doc === "agreement" ? e.agreement_title : `Invoice ${e.invoice_number ?? ""}`;

  return (
    <main className="min-h-dvh px-4 py-8 print:p-0">
      <title>{`${title} - ${e.project_name}`}</title>
      {/* @page cannot be scoped by a selector, so these margins are injected
          only when there is a letterhead - otherwise every document would
          print with a 40mm gap it has no use for. The top clears the header
          rule (ends 32.2mm) and page one stops above the foot decoration
          (first specks at 231.8mm of 297mm). */}
      {letterhead.url && (
        <style>{`@media print{@page{size:A4;margin:40mm 14mm 22mm}@page :first{margin-bottom:70mm}}`}</style>
      )}

      <div data-print-hide className="mx-auto mb-5 flex max-w-[210mm] items-center justify-between gap-4">
        <p className="text-sm text-subtle">
          Choose <span className="text-fg">Save as PDF</span> as the destination to download.
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={!letterhead.settled}
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[10px] bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Printer size={15} aria-hidden="true" />
          {letterhead.settled ? "Print / Save PDF" : "Preparing…"}
        </button>
      </div>

      {/* 210mm rather than 820px so the letterhead's geometry is 1:1 on screen
          and on paper - what the admin previews is what prints. */}
      <div
        className={cn(
          "paper relative mx-auto max-w-[210mm] rounded-card shadow-[0_24px_80px_-24px_rgba(0,0,0,0.8)] print:max-w-none print:rounded-none print:p-0",
          letterhead.url
            ? "px-6 pb-14 pt-10 sm:px-[14mm] sm:pb-[70mm] sm:pt-[40mm]"
            : "px-8 py-10 sm:px-14 sm:py-14"
        )}
      >
        {letterhead.url && (
          <>
            <LetterheadPage url={letterhead.url} />
            <LetterheadRunningHeader url={letterhead.url} />
          </>
        )}

        <div className="doc-body">
          {/* The letterhead already carries the mark and the contact block, so
              this would be a second copy of both. */}
          {!letterhead.url && (
            <div className="mb-10 flex items-center gap-2.5">
              {/* The mark is white; on paper it has to be inverted to show. */}
              <CubeLogo size={28} className="invert" />
              <span className="text-sm font-semibold tracking-tight text-fg">Enigma-Cube</span>
            </div>
          )}
          {doc === "agreement" ? (
            <AgreementDocument engagement={e} />
          ) : (
            <InvoiceDocument engagement={e} />
          )}
        </div>
      </div>
    </main>
  );
}
