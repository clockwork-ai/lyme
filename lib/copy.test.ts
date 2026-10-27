import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";

const roots = ["lib", "server", "public/chat", "src", "README.md", "wrangler.toml", "public/privacy/index.html", "public/assets/site.js"];

function files(path: string): string[] {
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path).flatMap((name) => files(`${path}/${name}`));
}

test("chat copy has no em dash or en dash", () => {
  const hits = filesIn(roots).filter((file) => {
    if (file.endsWith("guard.ts") || file.endsWith(".test.ts")) return false;
    return /[\u2013\u2014]/.test(readFileSync(file, "utf8"));
  });
  assert.deepEqual(hits, []);
});

function filesIn(paths: string[]): string[] {
  return paths.flatMap((path) => files(path));
}
