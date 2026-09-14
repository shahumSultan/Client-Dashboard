"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeading } from "@/components/shared/ProjectSections";
import {
  useLetterhead,
  useLetterheadMeta,
  useLetterheadUpload,
  useLetterheadRemove,
} from "@/hooks/useBranding";
import { errorDetail } from "@/hooks/useEngagements";
import { useReadOnly } from "@/lib/read-only";
import { cn, formatBytes } from "@/lib/utils";

const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg"];

// Where the document's text sits on the page, as a share of A4's 297mm. The
// overlay drawn from these is the cheapest way to stop a letterhead whose
// artwork runs through the middle of the page.
const SAFE_TOP = `${(40 / 297) * 100}%`;
const SAFE_BOTTOM = `${((297 - 232) / 297) * 100}%`;

export default function AdminSettingsPage() {
  const meta = useLetterheadMeta();
  const letterhead = useLetterhead();
  const upload = useLetterheadUpload();
  const remove = useLetterheadRemove();
  const [dragging, setDragging] = useState(false);
  const viewOnly = useReadOnly();

  async function take(file: File | undefined) {
    if (!file) return;
    if (file.type && !ACCEPTED.includes(file.type)) {
      toast.error("Upload a PNG or JPEG", {
        description: "Export your letterhead as an image at A4 portrait size.",
      });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("That letterhead is over 4 MB");
      return;
    }
    try {
      await upload.mutateAsync(file);
      toast.success("Letterhead updated");
    } catch (err) {
      toast.error(errorDetail(err, "Couldn't upload that letterhead"));
    }
  }

  const current = meta.data;

  return (
    <div>
      <PageHeading
        title="Letterhead"
        description="The stationery your agreements and invoices are printed on."
      />

      <Card className="mb-5 flex items-start gap-3 px-5 py-4">
        <ImageIcon size={16} className="mt-0.5 shrink-0 text-brand-soft" aria-hidden="true" />
        <div className="text-sm leading-relaxed text-subtle">
          <p className="font-medium text-fg">What to upload</p>
          <p className="mt-1">
            A full A4 portrait page - PNG or JPEG, at least 1000px wide, up to 4 MB. Artwork may
            run to the edges. Keep the middle of the page clear:{" "}
            <span className="text-fg">text is placed from 40mm down to 232mm</span>, which is the
            band marked on the preview.
          </p>
          <p className="mt-1">
            It appears in full on the first page of a document, and as the header band alone on
            any page after. Agreements you upload as PDFs are left untouched.
          </p>
        </div>
      </Card>

      {meta.isLoading ? (
        <Skeleton className="h-[28rem] w-full rounded-card" aria-busy="true" />
      ) : current ? (
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-fg">{current.filename}</p>
              <p className="mt-0.5 text-xs text-subtle">
                {current.width_px}x{current.height_px} · {formatBytes(current.size_bytes)}
              </p>
            </div>
            {!viewOnly && (
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-[10px] border border-hairline px-3 text-xs font-medium text-fg transition-colors hover:bg-white/[0.06]">
                  <Upload size={13} aria-hidden="true" />
                  {upload.isPending ? "Uploading…" : "Replace"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="sr-only"
                    disabled={upload.isPending}
                    onChange={(ev) => take(ev.target.files?.[0])}
                  />
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  loading={remove.isPending}
                  onClick={() =>
                    remove.mutate(undefined, {
                      onSuccess: () => toast.success("Letterhead removed"),
                      onError: () => toast.error("Couldn't remove it"),
                    })
                  }
                >
                  Remove
                </Button>
              </div>
            )}
          </div>

          {/* A4-shaped preview with the text band marked. */}
          <div className="mt-4 flex justify-center">
            <div
              className="relative w-full max-w-[22rem] overflow-hidden rounded-[10px] border border-hairline bg-white"
              style={{ aspectRatio: "210 / 297" }}
            >
              {letterhead.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={letterhead.url}
                  alt="Your letterhead"
                  className="h-full w-full select-none object-cover"
                />
              ) : (
                <div className="grid h-full place-items-center">
                  <Loader2 size={18} className="animate-spin text-faint" aria-hidden="true" />
                </div>
              )}
              <div
                className="pointer-events-none absolute inset-x-0 border-y border-dashed border-brand-soft/70"
                style={{ top: SAFE_TOP, bottom: SAFE_BOTTOM }}
                aria-hidden="true"
              >
                <span className="absolute -top-px left-1 text-[9px] font-medium text-brand-soft">
                  text starts
                </span>
                <span className="absolute -bottom-3.5 left-1 text-[9px] font-medium text-brand-soft">
                  text ends
                </span>
              </div>
            </div>
          </div>
        </Card>
      ) : viewOnly ? (
        <Card className="px-5 py-6">
          <p className="text-sm text-subtle">No letterhead has been uploaded yet.</p>
        </Card>
      ) : (
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
            dragging
              ? "border-brand-soft bg-brand-wash"
              : "border-hairline-strong hover:border-brand-soft/50 hover:bg-white/[0.03]"
          )}
        >
          {upload.isPending ? (
            <Loader2 size={22} className="animate-spin text-brand-soft" aria-hidden="true" />
          ) : (
            <Upload size={22} className="text-brand-soft" aria-hidden="true" />
          )}
          <span className="mt-4 text-sm font-medium text-fg">
            {upload.isPending ? "Uploading…" : "Drop your letterhead here, or click to choose"}
          </span>
          <span className="mt-1.5 text-xs text-subtle">
            A4 portrait · PNG or JPEG · at least 1000px wide · up to 4 MB
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg"
            className="sr-only"
            disabled={upload.isPending}
            onChange={(ev) => take(ev.target.files?.[0])}
          />
        </label>
      )}
    </div>
  );
}
