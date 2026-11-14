import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";
import { canonicalRedirectTarget } from "./canonical.ts";

const GUIDE_DESCRIPTION =
  "Guides for homeowners in Stockport and High Lane. Plain help with plumbing and heating jobs around the house, from Callum.";
const ARTICLE_DESCRIPTION =
  "Radiator cold at the top, bottom or middle? How to bleed it, when it needs a flush or balancing, and when to call a plumber. From Callum in High Lane.";

function target(url: string, status: number, location: string | null, method = "GET") {
  return canonicalRedirectTarget(url, method, status, location);
}

test("a missing slash on the apex becomes one permanent redirect and keeps the query", () => {
  assert.equal(
    target("https://lymeplumbing.co.uk/services?utm=test", 307, "/services/?utm=test"),
    "https://lymeplumbing.co.uk/services/?utm=test",
  );
  assert.equal(target("https://lymeplumbing.co.uk/services/", 200, null), null);
  assert.equal(target("https://lymeplumbing.co.uk/about-us?x=1", 301, "/about/?x=1"), null);
});

test("www and a missing slash land on the slashed apex URL in one hop", () => {
  assert.equal(
    target("https://www.lymeplumbing.co.uk/services?utm=test", 307, "/services/?utm=test"),
    "https://lymeplumbing.co.uk/services/?utm=test",
  );
  assert.equal(
    target("https://www.lymeplumbing.co.uk/services/", 200, null),
    "https://lymeplumbing.co.uk/services/",
  );
  assert.equal(
    target("https://www.lymeplumbing.co.uk/?x=1", 200, null),
    "https://lymeplumbing.co.uk/?x=1",
  );
  assert.equal(
    target("https://www.lymeplumbing.co.uk/about-us?x=1", 301, "/about/?x=1"),
    "https://lymeplumbing.co.uk/about/?x=1",
  );
  assert.equal(
    target("https://www.lymeplumbing.co.uk/assets/site.css?v=1", 200, null),
    "https://lymeplumbing.co.uk/assets/site.css?v=1",
  );
});

test("a local trailing-slash redirect stays on the local host", () => {
  assert.equal(
    target("http://127.0.0.1:8787/contact?x=1", 307, "/contact/?x=1"),
    "http://127.0.0.1:8787/contact/?x=1",
  );
});

test("the quote and chat routes are not redirected, including POST", () => {
  assert.equal(target("https://www.lymeplumbing.co.uk/api/quote", 405, null), null);
  assert.equal(target("https://lymeplumbing.co.uk/api/quote", 405, null, "POST"), null);
  assert.equal(target("https://www.lymeplumbing.co.uk/api/chat", 200, null, "POST"), null);
  assert.equal(target("https://www.lymeplumbing.co.uk/services", 307, "/services/", "POST"), null);
});

test("a query on the request is kept when the asset location omits it", () => {
  assert.equal(
    target("https://lymeplumbing.co.uk/services/index.html?x=1", 307, "/services/"),
    "https://lymeplumbing.co.uk/services/?x=1",
  );
});

function htmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = `${dir}/${name}`;
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return name.endsWith(".html") ? [path] : [];
  });
}

function meta(html: string, attr: string): string {
  const match = html.match(new RegExp(`<meta ${attr} content="([^"]*)"`));
  assert.ok(match, attr);
  return match[1];
}

test("the guides index has its own short description", () => {
  const index = readFileSync("public/guides/index.html", "utf8");
  const article = readFileSync("public/guides/radiators-cold-top-or-bottom/index.html", "utf8");
  const description = meta(index, 'name="description"');
  assert.equal(description, GUIDE_DESCRIPTION);
  assert.equal(meta(index, 'property="og:description"'), GUIDE_DESCRIPTION);
  assert.ok(description.length < 160, String(description.length));
  assert.equal(meta(article, 'name="description"'), ARTICLE_DESCRIPTION);
  assert.ok(index.includes(`<p class="lede">${ARTICLE_DESCRIPTION}</p>`));
  assert.equal(/[\u2013\u2014]/.test(description), false);
  for (const banned of ["MCS", "grant", "BUS", "accredited", "certified", "approved installer", "insurance"]) {
    assert.equal(description.toLowerCase().includes(banned.toLowerCase()), false, banned);
  }
});

test("robots.txt disallows /api/ and the sitemap is unchanged", () => {
  const robots = readFileSync("public/robots.txt", "utf8");
  const sitemap = readFileSync("public/sitemap.xml", "utf8");
  assert.match(robots, /Disallow:\s*\/api\/\s*$/m);
  assert.match(robots, /Disallow:\s*\/photo-frame\/?/);
  assert.equal(sitemap.includes("/api/"), false);
  assert.equal(sitemap.match(/<loc>/g)?.length, 42);
  const linked = htmlFiles("public").filter((file) => /<a\b[^>]*href=["'][^"']*\/api\//i.test(readFileSync(file, "utf8")));
  assert.deepEqual(linked, []);
  const contact = readFileSync("public/contact/index.html", "utf8");
  assert.match(contact, /action="\/api\/quote"/);
});
