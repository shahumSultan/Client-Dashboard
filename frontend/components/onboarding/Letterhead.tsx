"use client";

/**
 * The company letterhead, behind a document.
 *
 * Print and screen need different things from the same image, because only one
 * of them has pages.
 *
 * - In print it is a single fixed box at the page-area origin, which Chrome
 *   repeats on every page: every sheet carries the whole stationery, exactly
 *   like preprinted paper. It is deliberately NOT offset into the @page margin
 *   area - Chrome refuses, landing the box at the foot of page one and
 *   dropping it from every page after.
 * - On screen the document is one continuous card, so there is nothing to
 *   align a page-shaped image to. Tiling it every 297mm drops a second header
 *   and the foot decoration into the middle of flowing text. Only the head and
 *   foot bands are drawn instead, pinned to the top and bottom of the card,
 *   with the text held clear of both by .paper's padding.
 *
 * Plain <img> rather than next/image: blob URLs cannot go through the image
 * optimiser.
 */
export function LetterheadSheet({ url }: { url: string }) {
  return (
    <div
      className="lh-sheet pointer-events-none absolute inset-0 overflow-hidden rounded-card print:rounded-none"
      data-letterhead="sheet"
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" aria-hidden="true" className="lh-print select-none" />

      <div className="lh-head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" aria-hidden="true" className="select-none" />
      </div>
      <div className="lh-foot">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" aria-hidden="true" className="select-none" />
      </div>
    </div>
  );
}

/**
 * Reserves the stationery's head and foot on every printed page.
 *
 * A table, because thead and tfoot are the only boxes that repeat per page in
 * paged media - padding on the content would hold space on page one alone.
 * On screen the spacer rows have no height and the table is a plain block, so
 * this is invisible outside print.
 */
export function LetterheadFrame({ children }: { children: React.ReactNode }) {
  return (
    <table className="doc-sheet">
      <thead>
        <tr>
          <td>
            <div className="doc-head-space" />
          </td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div className="doc-body">{children}</div>
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td>
            <div className="doc-foot-space" />
          </td>
        </tr>
      </tfoot>
    </table>
  );
}
