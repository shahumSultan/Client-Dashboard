import "./print.css";

/**
 * Exists only to scope the print stylesheet to the document routes.
 *
 * globals.css is imported by the root layout, so anything added there applies
 * to every route in the app - including its @page block. These rules belong to
 * printed documents alone, so they load here instead.
 */
export default function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
