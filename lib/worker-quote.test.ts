// The worker's entry point must hand the quote form its context. A missing argument here took the
// whole contact form down with a 1101 on 14 Nov 2026. The worker can't be imported in Node
// (Cloudflare-only modules), so this reads the entry line itself.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("the worker receives ctx and passes it to the quote handler", () => {
  const src = readFileSync(new URL("../src/worker.js", import.meta.url), "utf8");
  assert.match(src, /async fetch\(request, env, ctx\)/, "fetch must take (request, env, ctx)");
  assert.match(src, /handleQuote\(request, env, ctx\)/);
});
