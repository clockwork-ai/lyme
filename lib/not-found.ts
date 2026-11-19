/**
 * /404 and /404/ are real files, so the asset layer serves them as 200.
 * They are only the not-found template, so the worker answers them as 404.
 * A path that is already 404 is left as it is.
 */
export function forcedNotFoundStatus(pathname: string, assetStatus: number): 404 | null {
  if (assetStatus === 404) return null;
  if (pathname === "/404" || pathname === "/404/" || pathname === "/404.html") return 404;
  return null;
}
