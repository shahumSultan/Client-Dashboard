/**
 * Resolve a page title from a pathname.
 *
 * Longest match wins. A naive first-match loop returns the shortest prefix,
 * so with "/admin" in the map every admin sub-page was titled "Overview".
 */
export function titleFor(
  pathname: string,
  titles: Record<string, string>,
  fallback: string
): string {
  const match = Object.keys(titles)
    .filter((path) => pathname === path || pathname.startsWith(path + "/"))
    .sort((a, b) => b.length - a.length)[0];
  return match ? titles[match] : fallback;
}
