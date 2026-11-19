import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { forcedNotFoundStatus } from "./not-found.ts";

test("the not-found addresses are a real 404, and other pages are not", () => {
  assert.equal(forcedNotFoundStatus("/404", 200), 404);
  assert.equal(forcedNotFoundStatus("/404/", 200), 404);
  assert.equal(forcedNotFoundStatus("/404.html", 301), 404);
  assert.equal(forcedNotFoundStatus("/404", 404), null);
  assert.equal(forcedNotFoundStatus("/thanks/", 200), null);
  assert.equal(forcedNotFoundStatus("/services/heat-pumps/", 200), null);
  assert.equal(forcedNotFoundStatus("/this-page-does-not-exist-xyz/", 404), null);
});

test("the worker applies that status without touching the asset config", () => {
  const worker = readFileSync("src/worker.js", "utf8");
  const wrangler = readFileSync("wrangler.toml", "utf8");
  assert.match(worker, /forcedNotFoundStatus\(url\.pathname, assetResponse\.status\)/);
  assert.match(wrangler, /not_found_handling = "404-page"/);
  assert.match(wrangler, /html_handling = "auto-trailing-slash"/);
});
