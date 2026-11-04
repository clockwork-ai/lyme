// /api/reviews/lyme and /api/reviews/lyme/summary, on Lyme's own address, so the page only ever
// talks to lymeplumbing.co.uk. The Worker asks the reviews service (REVIEWS_UPSTREAM in
// wrangler.toml) for Google's rating, count and up to five reviews, exactly as Google gives
// them, and passes them on. Nothing is stored here. The edge cache follows the upstream
// Cache-Control, which has one TTL setting that can go to zero.
// Preview hosts (workers.dev, localhost) get clearly labelled example data instead, never real reviews.

const SLUG = "lyme";
const PROD_ORIGIN = "https://lymeplumbing.co.uk";
const TIMEOUT_MS = 6000;

export const isPreviewHost = (host) => /\.workers\.dev$/i.test(host) || host === "localhost" || host === "127.0.0.1";

function json(body, status, cacheControl) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheControl || "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

export function examplePayload(summary) {
  const r = (i, rating, text, rel) => ({
    text, rating, authorName: "Example customer " + i, authorPhotoUri: "",
    authorUri: "https://www.google.com/maps", reviewUri: "https://www.google.com/maps",
    publishTime: "", relativePublishTime: rel,
  });
  const base = { slug: SLUG, rating: 4.8, userRatingCount: 12, fixture: true };
  if (summary) return base;
  return {
    ...base, name: "Example", order: "google",
    mapsUri: "https://www.google.com/maps", allReviewsUrl: "https://www.google.com/maps",
    reviews: [
      r(1, 5, "Example review text. This is placeholder wording on a preview, so the layout can be checked.", "a week ago"),
      r(2, 5, "Another example review, a bit longer, to show how a card wraps across two or three lines on a phone and how the name, photo and link sit together.", "2 weeks ago"),
      r(3, 4, "Short example.", "a month ago"),
      r(4, 5, "Example number four, with no photo on the author.", "2 months ago"),
      r(5, 3, "The fifth example shows a three-star rating so the stars render for every value.", "3 months ago"),
    ],
  };
}

export async function handleReviews(request, env, ctx) {
  const url = new URL(request.url);
  const m = url.pathname.match(/^\/api\/reviews\/([a-z0-9-]+)(\/summary)?\/?$/);
  if (!m || m[1] !== SLUG) return json({ error: "unknown" }, 404);
  if (request.method !== "GET" && request.method !== "HEAD") return json({ error: "method" }, 405);
  const summary = !!m[2];

  if (isPreviewHost(url.hostname)) return json(examplePayload(summary), 200);

  const upstream = String((env && env.REVIEWS_UPSTREAM) || "").replace(/\/$/, "");
  if (!/^https:\/\/[^/\s]+$/.test(upstream)) return json({ error: "not set up" }, 503);

  // Same key whatever query string a visitor adds: there is no filter to pass on.
  const key = new Request(url.origin + url.pathname.replace(/\/$/, ""), { method: "GET" });
  const cache = typeof caches !== "undefined" ? caches.default : null;
  if (cache) {
    const hit = await cache.match(key);
    if (hit) return hit;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(upstream + "/api/reviews/" + SLUG + (summary ? "/summary" : ""), {
      headers: { Origin: PROD_ORIGIN, Accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!res.ok) return json({ error: "unavailable" }, 503);
    const body = await res.text();
    const out = json(body, 200, res.headers.get("cache-control") || "no-store");
    if (cache && ctx && /s-maxage=[1-9]/.test(out.headers.get("cache-control") || "")) ctx.waitUntil(cache.put(key, out.clone()));
    return out;
  } catch {
    return json({ error: "unavailable" }, 503);
  } finally {
    clearTimeout(timer);
  }
}
