"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, FileText, Loader2 } from "lucide-react";
import { fetchPdf, openPdf } from "@/hooks/useEngagements";
import { formatBytes } from "@/lib/utils";
import type { Engagement } from "@/lib/types";

/**
 * The admin's uploaded agreement, shown in the portal.
 *
 * Rendered by the browser's own PDF viewer - the exact file, not a
 * re-typeset copy - so what the client reads is byte-for-byte what they sign.
 */
export function PdfDocument({ engagement: e }: { engagement: Engagement }) {
  const doc = e.document;
  // Keyed by file, so replacing it refetches rather than showing the old one.
  const key = doc?.sha256;
  const [loaded, setLoaded] = useState<{ key: string; url: string } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!key) return;
    let url: string | null = null;
    let cancelled = false;
    fetchPdf(`/engagements/${e.id}/document`)
      .then((u) => {
        url = u;
        if (!cancelled) setLoaded({ key, url: u });
      })
      .catch(() => {
        if (!cancelled) setFailedKey(key);
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [e.id, key]);

  if (!doc) return null;
  const url = loaded && loaded.key === key ? loaded.url : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-wash text-brand-soft">
            <FileText size={17} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-fg">{doc.filename}</p>
            <p className="text-xs text-subtle">
              {doc.page_count} {doc.page_count === 1 ? "page" : "pages"} · {formatBytes(doc.size_bytes)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            openPdf(`/engagements/${e.id}/document`).catch(() =>
              toast.error("Couldn't open the document")
            )
          }
          className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-subtle transition-colors hover:text-brand-soft"
        >
          <ExternalLink size={13} aria-hidden="true" />
          Open full screen
        </button>
      </div>

      <div className="overflow-hidden rounded-[12px] border border-hairline bg-white">
        {url ? (
          <iframe
            src={`${url}#navpanes=0&view=FitH`}
            title={doc.filename}
            className="h-[75vh] min-h-[480px] w-full"
          />
        ) : (
          <div className="grid h-[50vh] place-items-center bg-raised text-sm text-subtle">
            {failedKey === key ? (
              "The document couldn't be loaded. Try “Open full screen”."
            ) : (
              <Loader2 size={18} className="animate-spin" aria-label="Loading document" />
            )}
          </div>
        )}
      </div>
      {/* Phones' inline PDF viewers often show only the first page. */}
      <p className="text-xs text-subtle sm:hidden">
        Only seeing the first page? Use “Open full screen” to read the whole document.
      </p>
    </div>
  );
}
