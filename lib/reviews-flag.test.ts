import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";

function files(path: string): string[] {
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path).flatMap((name) => files(`${path}/${name}`));
}

test("reviews stay unlinked while the flag is off", () => {
  const flags = readFileSync("public/assets/site.js", "utf8");
  const on = /var SHOW_REVIEWS = true;/.test(flags);
  assert.equal(/var SHOW_REVIEWS = false;/.test(flags), !on);
  const pages = files("public").filter((file) => file.endsWith(".html") || file.endsWith(".xml"));
  const linked = pages.filter((file) => /<a\b[^>]*href="[^"]*reviews\//.test(readFileSync(file, "utf8")));
  const sitemap = readFileSync("public/sitemap.xml", "utf8");
  const home = readFileSync("public/index.html", "utf8");
  if (!on) {
    assert.deepEqual(linked, []);
    assert.equal(sitemap.includes("/reviews/"), false);
    assert.equal(home.includes('id="reviews"'), false);
  }
});
