import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";
import { examplePayload, handleReviews, isPreviewHost } from "../functions/api/reviews.js";

function files(path: string): string[] {
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path).flatMap((name) => files(`${path}/${name}`));
}
const pages = files("public").filter((f) => f.endsWith(".html"));

test("no review or rating schema on any page, and the Plumber JSON-LD is unchanged", () => {
  for (const f of pages) {
    const html = readFileSync(f, "utf8");
    assert.doesNotMatch(html, /AggregateRating|reviewRating|"@type":\s*"Review"|itemtype="[^"]*Review|property="(schema:)?review/i, f);
  }
  const home = readFileSync("public/index.html", "utf8");
  const ld = JSON.parse(home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]);
  assert.equal(ld["@type"], "Plumber");
  assert.equal(ld.name, "Lyme Plumbing & Heating");
  assert.equal(ld.telephone, "+447846729203");
  assert.deepEqual(ld.address, { "@type": "PostalAddress", addressLocality: "High Lane", addressRegion: "Greater Manchester", postalCode: "SK6", addressCountry: "GB" });
  assert.equal("review" in ld || "aggregateRating" in ld, false);
});

test("the live block is on the home and Reviews pages only, deferred, with the static review and links kept as the fallback", () => {
  for (const [f, src] of [["public/index.html", "assets/reviews.js"], ["public/reviews/index.html", "../assets/reviews.js"]]) {
    const html = readFileSync(f, "utf8");
    assert.ok(html.includes('data-reviews="lyme"'), f);
    assert.ok(html.includes(`<script src="${src}" defer></script>`), `${f} loads the script deferred`);
    assert.ok(html.includes("Louise K. Google review."), `${f} keeps the static review until live data shows`);
    assert.ok(html.includes("https://www.google.com/maps?cid=18273910283615300956"));
    assert.ok(html.includes('href="tel:+447846729203"'));
    assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1, `${f} has one H1`);
  }
  const others = pages.filter((f) => f !== "public/index.html" && f !== "public/reviews/index.html");
  for (const f of others) assert.ok(!readFileSync(f, "utf8").includes("reviews.js"), f);
});

test("the served script names no vendor, tool or client and has no star filter", () => {
  const js = readFileSync("public/assets/reviews.js", "utf8");
  assert.doesNotMatch(js, /vercel|clockwork|jobflow|places api|\bAI\b|lyme/i);
  assert.doesNotMatch(js, /minRating|stars=|filter\(/);
  assert.doesNotMatch(js, /[–—]/);
  assert.ok(js.includes("Reviews shown in the order Google gives them."));
  assert.ok(js.includes("Read all reviews on Google"));
  assert.ok(js.includes('rel="noopener"'));
  assert.ok(statSync("public/assets/reviews.js").size < 8000);
});

test("the reviews route: example data only on preview hosts, 503 when not set up, 404 for anything else", async () => {
  assert.ok(isPreviewHost("feature-x-lyme-plumbing.lymeplumbingandheating.workers.dev"));
  assert.ok(!isPreviewHost("lymeplumbing.co.uk") && !isPreviewHost("www.lymeplumbing.co.uk"));
  const preview = await handleReviews(new Request("https://abc-lyme-plumbing.x.workers.dev/api/reviews/lyme"), {}, null);
  const body = await preview.json();
  assert.equal(body.fixture, true);
  assert.equal(body.reviews.length, 5);
  const summary = await (await handleReviews(new Request("https://abc.x.workers.dev/api/reviews/lyme/summary"), {}, null)).json();
  assert.deepEqual(Object.keys(summary).sort(), ["fixture", "rating", "slug", "userRatingCount"]);
  const live = await handleReviews(new Request("https://lymeplumbing.co.uk/api/reviews/lyme"), {}, null);
  assert.equal(live.status, 503);
  assert.equal(live.headers.get("cache-control"), "no-store");
  assert.equal((await handleReviews(new Request("https://lymeplumbing.co.uk/api/reviews/someone-else"), {}, null)).status, 404);
  assert.equal((await handleReviews(new Request("https://lymeplumbing.co.uk/api/reviews/lyme", { method: "POST" }), { REVIEWS_UPSTREAM: "https://x.example" }, null)).status, 405);
  assert.equal(examplePayload(false).order, "google");
});

test("the live route passes the upstream body through untouched and asks as the live site", async () => {
  const seen: { url: string; origin: string | null }[] = [];
  const realFetch = globalThis.fetch;
  const upstream = JSON.stringify({ slug: "lyme", rating: 5, userRatingCount: 6, order: "google", reviews: [{ text: "word for word" }] });
  globalThis.fetch = (async (u: string, init?: RequestInit) => {
    seen.push({ url: String(u), origin: new Headers(init?.headers).get("origin") });
    return new Response(upstream, { status: 200, headers: { "cache-control": "public, max-age=0, s-maxage=86400" } });
  }) as typeof fetch;
  try {
    const res = await handleReviews(new Request("https://lymeplumbing.co.uk/api/reviews/lyme?stars=5"), { REVIEWS_UPSTREAM: "https://reviews.example" }, null);
    assert.equal(res.status, 200);
    assert.equal(await res.text(), upstream);
    assert.equal(seen[0].url, "https://reviews.example/api/reviews/lyme");
    assert.equal(seen[0].origin, "https://lymeplumbing.co.uk");
  } finally {
    globalThis.fetch = realFetch;
  }
});
