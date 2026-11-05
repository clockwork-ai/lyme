import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";

function htmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = `${dir}/${name}`;
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return name.endsWith(".html") ? [path] : [];
  });
}

const page = readFileSync("public/photo-frame/index.html", "utf8");

test("photo frame is private", () => {
  const robots = readFileSync("public/robots.txt", "utf8");
  const sitemap = readFileSync("public/sitemap.xml", "utf8");
  assert.match(robots, /Disallow:\s*\/photo-frame\/?/);
  assert.match(page, /noindex/);
  assert.equal(sitemap.includes("photo-frame"), false);
  const linked = htmlFiles("public").filter((file) => {
    if (file.startsWith("public/photo-frame/")) return false;
    return /photo-frame/.test(readFileSync(file, "utf8"));
  });
  assert.deepEqual(linked, []);
  assert.equal(page.includes("site.js"), false);
  assert.equal(page.includes("widget.js"), false);
});

test("photo frame copy has no dash, no invented review count, and the Lyme stamp lines", () => {
  assert.equal(/[\u2013\u2014]/.test(page), false);
  assert.equal(/Which\?/i.test(page), false);
  assert.equal(/\d(?:\.\d)?\s+reviews/.test(page), false);
  assert.equal(page.includes("07846 729203"), true);
  assert.equal(page.includes("lymeplumbing.co.uk"), true);
  assert.equal(page.includes("Google reviews"), true);
  assert.equal(page.includes("link in our bio"), true);
  assert.equal(page.includes("1080x1350"), true);
  assert.equal(page.includes("1080x1080"), true);
  assert.equal(page.includes("1080x1920"), true);
  assert.equal(page.includes('id="share"'), true);
  assert.equal(page.includes('id="checked"'), true);
  assert.match(page, /id="share"[^>]*disabled/);
  assert.match(page, /id="save"[^>]*disabled/);
});
