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

test("paths that still 404 redirect once to a live page", () => {
  const expected = [
    ["/services/heatpumps", "/services/heat-pumps/"],
    ["/services/heatpumps/", "/services/heat-pumps/"],
    ["/services/hot-water-cylinder", "/services/unvented-cylinders/"],
    ["/services/hot-water-cylinder/", "/services/unvented-cylinders/"],
    ["/services/hot-water-cylinders", "/services/unvented-cylinders/"],
    ["/services/hot-water-cylinders/", "/services/unvented-cylinders/"],
    ["/services/underfloorheating", "/services/underfloor-heating/"],
    ["/services/underfloorheating/", "/services/underfloor-heating/"],
    ["/services/radiator", "/services/radiators/"],
    ["/services/radiator/", "/services/radiators/"],
    ["/services/emergency", "/services/emergency-plumber/"],
    ["/services/emergency/", "/services/emergency-plumber/"],
    ["/services/emergency-plumbing", "/services/emergency-plumber/"],
    ["/services/emergency-plumbing/", "/services/emergency-plumber/"],
    ["/services/air-source-heat-pump", "/services/heat-pumps/"],
    ["/services/air-source-heat-pump/", "/services/heat-pumps/"],
    ["/services/air-source-heat-pumps", "/services/heat-pumps/"],
    ["/services/air-source-heat-pumps/", "/services/heat-pumps/"],
    ["/services/ashp", "/services/heat-pumps/"],
    ["/services/ashp/", "/services/heat-pumps/"],
    ["/services/ufh", "/services/underfloor-heating/"],
    ["/services/ufh/", "/services/underfloor-heating/"],
    ["/heat-pumps", "/services/heat-pumps/"],
    ["/heat-pumps/", "/services/heat-pumps/"],
    ["/unvented-cylinders", "/services/unvented-cylinders/"],
    ["/unvented-cylinders/", "/services/unvented-cylinders/"],
    ["/plumbing", "/services/plumbing/"],
    ["/plumbing/", "/services/plumbing/"],
    ["/review", "/reviews/"],
    ["/review/", "/reviews/"],
    ["/privacy-policy", "/privacy/"],
    ["/privacy-policy/", "/privacy/"],
    ["/thank-you", "/thanks/"],
    ["/thank-you/", "/thanks/"],
    ["/area/high-lane", "/areas/high-lane/"],
    ["/area/high-lane/", "/areas/high-lane/"],
    ["/stockport", "/areas/stockport/"],
    ["/stockport/", "/areas/stockport/"],
    ["/marple", "/areas/marple/"],
    ["/marple/", "/areas/marple/"],
    ["/bramhall", "/areas/bramhall/"],
    ["/bramhall/", "/areas/bramhall/"],
    ["/poynton", "/areas/poynton/"],
    ["/poynton/", "/areas/poynton/"],
    ["/cheadle", "/areas/cheadle/"],
    ["/cheadle/", "/areas/cheadle/"],
    ["/cheadle-hulme", "/areas/cheadle-hulme/"],
    ["/cheadle-hulme/", "/areas/cheadle-hulme/"],
    ["/new-mills", "/areas/new-mills/"],
    ["/new-mills/", "/areas/new-mills/"],
    ["/wilmslow", "/areas/wilmslow/"],
    ["/wilmslow/", "/areas/wilmslow/"],
    ["/hazel-grove", "/areas/hazel-grove/"],
    ["/hazel-grove/", "/areas/hazel-grove/"],
  ];
  const sources = new Set(rules.map((item) => item.from));
  for (const [from, to] of expected) {
    const hit = rules.find((item) => item.from === from);
    assert.ok(hit, from);
    assert.equal(hit.to, to);
    assert.equal(hit.code, "301");
    assert.equal(sources.has(to), false, `${from} chains through ${to}`);
    assert.equal(existsSync(`public${to}index.html`), true, to);
  }
});

test("a redirect is a single hop to a page, not another redirect", () => {
  const sources = new Set(rules.map((item) => item.from));
  for (const item of rules) {
    assert.notEqual(item.from, item.to, item.from);
    if (item.code !== "301") continue;
    const bare = item.to.endsWith("/") ? item.to.slice(0, -1) : `${item.to}/`;
    assert.equal(sources.has(item.to), false, item.from);
    assert.equal(sources.has(bare), false, item.from);
    assert.equal(existsSync(`public${item.to}index.html`), true, item.to);
  }
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
