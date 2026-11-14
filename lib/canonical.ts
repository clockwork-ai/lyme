/**
 * One permanent redirect for the www host and for the asset layer's
 * temporary trailing-slash redirect. Query strings stay. /api/* is left
 * alone so the quote form POST is not turned into a GET.
 */

export const WWW_HOST = "www.lymeplumbing.co.uk";
export const APEX_HOST = "lymeplumbing.co.uk";

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function sameResource(left: URL, right: URL): boolean {
  return (
    left.protocol === right.protocol &&
    left.host === right.host &&
    left.pathname === right.pathname &&
    left.search === right.search
  );
}

function withRequestQuery(dest: URL, request: URL): void {
  if (!dest.search && request.search) dest.search = request.search;
}

/**
 * Absolute URL to send the browser to, or null when the asset response
 * should be returned as it is.
 */
export function canonicalRedirectTarget(
  requestUrl: string,
  method: string,
  assetStatus: number,
  assetLocation: string | null,
): string | null {
  if (method !== "GET" && method !== "HEAD") return null;

  const url = new URL(requestUrl);
  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) return null;

  const www = url.hostname.toLowerCase() === WWW_HOST;
  if (!www && assetStatus !== 307) return null;

  let dest: URL;
  if (REDIRECT_STATUSES.has(assetStatus) && assetLocation) {
    dest = new URL(assetLocation, url);
    withRequestQuery(dest, url);
  } else if (www) {
    dest = new URL(url.href);
  } else {
    return null;
  }

  if (www) {
    dest.protocol = "https:";
    dest.hostname = APEX_HOST;
    dest.port = "";
  }

  if (sameResource(dest, url)) return null;
  return dest.href;
}
