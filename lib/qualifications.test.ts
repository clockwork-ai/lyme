import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { business } from "./business.ts";
import { fixedReply } from "./intent.ts";
import { buildInstructions } from "./prompt.ts";
import { qualificationReply, qualifications } from "./qualifications.ts";

const title =
  "BPEC Level 3 Award in the Installation and Maintenance of Heat Pump Systems (Non-refrigerant Circuits)";
const summary =
  "It covers installing, commissioning, servicing and maintaining heat pump systems (non-refrigerant circuits).";
const forbidden = /\b(MCS|F-gas|Gas Safe|NICEIC|Benchmark|insurance)\b|\bG3\b/i;

test("the published list is the one verified qualification", () => {
  assert.deepEqual(
    qualifications.map((item) => item.title),
    [title],
  );
  assert.equal(qualifications[0]?.label, "Ofqual regulated");
  assert.equal(qualifications[0]?.summary, summary);
  assert.equal(qualifications[0]?.short.includes("BPEC Level 3"), true);
  assert.doesNotMatch(JSON.stringify(qualifications), /[\u2013\u2014]/);
  assert.doesNotMatch(JSON.stringify(qualifications), forbidden);
  assert.equal(JSON.stringify(qualifications).includes(".html"), false);
});

test("the about page lists every qualification in the array", () => {
  const html = readFileSync("public/about/index.html", "utf8");
  const start = html.indexOf('id="qualifications"');
  const end = html.indexOf("cta-band", start);
  assert.equal(start > 0, true);
  assert.equal(end > start, true);
  const section = html.slice(start, end);
  for (const item of qualifications) {
    assert.equal(section.includes(item.title), true);
    assert.equal(section.includes(item.label), true);
    assert.equal(section.includes(item.summary), true);
  }
  assert.equal(section.includes(".html"), false);
  assert.doesNotMatch(section, /[\u2013\u2014]/);
  assert.doesNotMatch(section, forbidden);
});

test("the home page trust line sits with the years of experience", () => {
  const html = readFileSync("public/index.html", "utf8");
  const facts = html.slice(html.indexOf('class="facts"'), html.indexOf('class="facts"') + 500);
  assert.match(facts, /Over 26 years of experience/);
  const item = qualifications[0];
  assert.equal(item !== undefined, true);
  if (!item) return;
  assert.match(facts, new RegExp(`href="about/#qualifications"[^>]*>${escapeReg(item.short)}, ${escapeReg(item.label)}`));
  assert.equal(facts.includes(".html"), false);
  assert.doesNotMatch(facts, /[\u2013\u2014]/);
  assert.doesNotMatch(facts, forbidden);
});

test("the chat names that qualification and still refuses the ones not listed", () => {
  const reply = fixedReply("What qualifications do you have?", business) || "";
  assert.equal(reply, qualificationReply());
  assert.match(reply, /BPEC Level 3 Award/);
  assert.match(reply, /Ofqual regulated/);
  assert.match(reply, /non-refrigerant circuits/);
  assert.match(reply, /only qualification listed/);
  assert.doesNotMatch(reply, forbidden);
  assert.doesNotMatch(reply, /[\u2013\u2014]/);

  const gasSafe = fixedReply("Are you Gas Safe?", business) || "";
  assert.match(gasSafe, /doesn't list Gas Safe/);
  assert.equal(gasSafe.includes("BPEC"), false);
  assert.match(fixedReply("Are you insured?", business) || "", /doesn't list/);
  assert.match(fixedReply("Is he MCS registered?", business) || "", /doesn't list/);

  const instructions = buildInstructions(business, "/about/");
  assert.match(instructions, new RegExp(escapeReg(title)));
  assert.match(instructions, /only qualification on the site/);
  assert.match(instructions, /Do not say he is insured/);
  assert.doesNotMatch(instructions, /[\u2013\u2014]/);
});

function escapeReg(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
