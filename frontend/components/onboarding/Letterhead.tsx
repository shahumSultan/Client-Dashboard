"use client";

/**
 * The company letterhead, behind a printed document.
 *
 * One element, both media. On screen it is absolutely positioned inside the
 * .paper card and tiled every 297mm, so a long document previews with the same
 * rhythm it prints at. In print it becomes a fixed box at the page-area origin
 * (see print.css), which Chrome repeats on every page - so every sheet carries
 * the stationery, exactly like preprinted paper.
 *
 * It is deliberately NOT split into a full page-one sheet plus a cropped
 * running header. That arrangement needs a fixed box offset into the @page
 * margin area, and Chrome refuses: a negative offset lands the box at the foot
 * of page one and removes it from every page after.
 *
 * A plain <img> rather than next/image: blob URLs cannot go through the image
 * optimiser.
 */
export function LetterheadSheet({ url }: { url: string }) {
  return (
    <div
      className="lh-sheet pointer-events-none absolute inset-0 overflow-hidden rounded-card print:rounded-none"
      // Screen paints the sheet as a repeating background (print.css); print
      // uses the <img> below. Same object URL, so the bytes decode once.
      style={{ backgroundImage: `url(${url})` }}
      data-letterhead="sheet"
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" aria-hidden="true" className="h-full w-full select-none object-cover" />
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
