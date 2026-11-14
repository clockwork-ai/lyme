import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const lines = readFileSync("public/_redirects", "utf8")
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"));

function rule(line: string) {
  const parts = line.split(/\s+/);
  assert.equal(parts.length, 3, line);
  return { from: parts[0], to: parts[1], code: parts[2] };
}

const rules = lines.map(rule);

test("old paths redirect to pages that exist, with and without a trailing slash", () => {
  const expected = [
    ["/services/heat-pump", "/services/heat-pumps/"],
    ["/services/heat-pump/", "/services/heat-pumps/"],
    ["/services/unvented-cylinder", "/services/unvented-cylinders/"],
    ["/services/unvented-cylinder/", "/services/unvented-cylinders/"],
    ["/services/underfloor", "/services/underfloor-heating/"],
    ["/services/underfloor/", "/services/underfloor-heating/"],
    ["/about-us", "/about/"],
    ["/about-us/", "/about/"],
    ["/contact-us", "/contact/"],
    ["/contact-us/", "/contact/"],
    ["/high-lane", "/areas/high-lane/"],
    ["/high-lane/", "/areas/high-lane/"],
  ];
  for (const [from, to] of expected) {
    const hit = rules.find((item) => item.from === from);
    assert.ok(hit, from);
    assert.equal(hit.to, to);
    assert.equal(hit.code, "301");
    const page = `public${to}index.html`;
    assert.equal(existsSync(page), true, page);
  }
});

test("boiler and gas paths are not redirected", () => {
  const banned = rules.filter((item) => /boiler|gas/i.test(item.from) || /boiler|gas/i.test(item.to));
  assert.deepEqual(banned, []);
});

test("favicon.ico is served from the existing icon", () => {
  const hit = rules.find((item) => item.from === "/favicon.ico");
  assert.ok(hit);
  assert.equal(hit.to, "/favicon.svg");
  assert.equal(hit.code, "200");
  const svg = readFileSync("public/favicon.svg", "utf8");
  assert.match(svg, /#0f1b23/);
  assert.match(svg, /#e08c55/);
  assert.match(svg, /M7 12h9v13M25 20h-9/);
});
