import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";

function files(path: string): string[] {
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path).flatMap((name) => files(`${path}/${name}`));
}

const reviewTexts = [
  "5 * service\nCallum is always quick to respond and is very professional, friendly. No job to small/too big, he is always happy to help, highly recommend .",
  "Very pleased with all the work and advice calam gave to me , very reassuring",
  "I've employed Callum a number of times and I've found him to be very professional! Prompt response, explains what is needed and does what he says he'll do. I've always been exceptional pleased with his solutions and outcomes. I highly recommend Callum!",
  "I had the awful experience of a Rat chewing through an air vent and entering my house under the suspended floor. It then chewed through a water pipe causing a leak under my house, pouring into the garage through the vent. Callum came on a call out, with very little notice and fixed the pipe work under my house quickly so I wasn't without water. He also assessed the potential entry points around the house and rat proofed where necessary. Callum also replaced some old pipework in the garage to ensure I don't have any bursts this winter. Service was perfect. The quality of his pipework is exceptional, most tradesmen throw it in but Callum's is a work of art.",
];
const reviewNames = [
  "Louise K. Google review.",
  "Richard N. Google review.",
  "Katherine C. Google review.",
  "D M. Google review.",
];

test("reviews stay unlinked while the flag is off, and show the Google reviews when it is on", () => {
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
    for (const text of reviewTexts) {
      assert.equal(html.includes(text.replace("\n", "<br>")), true);
    }
    for (const name of reviewNames) assert.equal(html.includes(name), true);
    assert.equal(html.includes("maps?cid=18273910283615300956"), true);
    assert.equal(html.includes("https://g.page/r/CVxtP2iV-Jn9EBM/review"), true);
    assert.equal(html.includes("AggregateRating"), false);
    assert.equal(html.includes('"@type": "Review"'), false);
    assert.equal(/verified/i.test(html), false);
    assert.doesNotMatch(html, /[\u2013\u2014]/);
  }
  assert.equal(home.includes('id="reviews"'), true);
});
