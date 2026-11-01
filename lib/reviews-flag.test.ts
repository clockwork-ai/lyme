import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";

function files(path: string): string[] {
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path).flatMap((name) => files(`${path}/${name}`));
}

const reviewText =
  "5 * service\nCallum is always quick to respond and is very professional, friendly. No job to small/too big, he is always happy to help, highly recommend .";

test("reviews stay unlinked while the flag is off, and show Louise's review when it is on", () => {
  const flags = readFileSync("public/assets/site.js", "utf8");
  const on = /var SHOW_REVIEWS = true;/.test(flags);
  assert.equal(/var SHOW_REVIEWS = false;/.test(flags), !on);
  const pages = files("public").filter((file) => file.endsWith(".html") || file.endsWith(".xml"));
  const linked = pages.filter((file) => /<a\b[^>]*href="[^"]*reviews\//.test(readFileSync(file, "utf8")));
  const sitemap = readFileSync("public/sitemap.xml", "utf8");
  const home = readFileSync("public/index.html", "utf8");
  const reviews = readFileSync("public/reviews/index.html", "utf8");
  if (!on) {
    assert.deepEqual(linked, []);
    assert.equal(sitemap.includes("/reviews/"), false);
    assert.equal(home.includes('id="reviews"'), false);
    return;
  }
  assert.equal(sitemap.includes("https://lymeplumbing.co.uk/reviews/"), true);
  for (const html of [home, reviews]) {
    assert.equal(html.includes(reviewText.replace("\n", "<br>")), true);
    assert.equal(html.includes("maps?cid=18273910283615300956"), true);
    assert.equal(html.includes("https://g.page/r/CVxtP2iV-Jn9EBM/review"), true);
    assert.equal(html.includes("AggregateRating"), false);
    assert.equal(html.includes('"@type": "Review"'), false);
    assert.equal(/verified/i.test(html), false);
    assert.doesNotMatch(html, /[\u2013\u2014]/);
  }
  assert.equal(home.includes('id="reviews"'), true);
});
