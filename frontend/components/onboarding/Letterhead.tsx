"use client";

/**
 * The company letterhead, behind a printed document.
 *
 * One uploaded asset, two presentations:
 *
 * - `LetterheadPage` is absolutely positioned, so the browser paints it on the
 *   page its position falls on - page one - giving the full stationery,
 *   including the decoration across the foot.
 * - `LetterheadRunningHeader` is fixed, so it repeats on every printed page,
 *   showing a 34mm window onto the *same* image at the same size and origin.
 *   On page one it paints identical pixels over identical pixels and so is
 *   invisible. CSS has no "every page but the first" selector, and with this
 *   arrangement it needs none.
 *
 * Both use the same object URL, so the bytes are fetched and decoded once.
 * A plain <img> rather than next/image: blob URLs cannot go through the
 * image optimiser.
 */
export function LetterheadPage({ url }: { url: string }) {
  return (
    <div
      className="lh-page pointer-events-none absolute inset-0 overflow-hidden rounded-card print:rounded-none"
      data-letterhead="page"
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" aria-hidden="true" className="h-full w-full select-none object-cover" />
    </div>
  );
}

export function LetterheadRunningHeader({ url }: { url: string }) {
  return (
    <div
      className="lh-header pointer-events-none hidden print:block"
      data-letterhead="header"
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" aria-hidden="true" className="select-none" />
    </div>
  );
}
