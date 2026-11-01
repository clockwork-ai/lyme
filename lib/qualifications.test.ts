import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { business } from "./business.ts";
import { fixedReply } from "./intent.ts";
import { buildInstructions } from "./prompt.ts";
import { heatPumpLine, homeTrust, homeTrustStrip, qualificationReply, qualifications } from "./qualifications.ts";

const bpec =
  "BPEC Level 3 Award in the Installation and Maintenance of Heat Pump Systems (Non-refrigerant Circuits)";
const summary =
  "It covers installing, commissioning, servicing and maintaining heat pump systems (non-refrigerant circuits).";
const forbidden = /\b(MCS|F-gas|Gas Safe|NICEIC|Benchmark|insurance|NVQ)\b|\bG3\b/i;

test("the published list is the verified wording", () => {
  assert.deepEqual(
    qualifications.map((item) => item.title),
    ["City & Guilds qualified", bpec],
  );
  const heatPump = qualifications[1];
  assert.equal(heatPump?.label, "Ofqual regulated");
  assert.equal(heatPump?.summary, summary);
  assert.equal(heatPump?.short?.includes("BPEC Level 3"), true);
  assert.equal(homeTrust(qualifications[0]!), "City & Guilds qualified");
  assert.equal(
    homeTrust(heatPump!),
    "BPEC Level 3 Award in heat pump systems (non-refrigerant circuits), Ofqual regulated",
  );
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
    assert.equal(section.includes(item.title.replaceAll("&", "&amp;")), true);
    if (item.label) assert.equal(section.includes(item.label), true);
    if (item.summary) assert.equal(section.includes(item.summary), true);
  }
  assert.equal(section.includes("NVQ"), false);
  assert.equal(section.includes(".html"), false);
  assert.doesNotMatch(section, /[\u2013\u2014]/);
  assert.doesNotMatch(section, forbidden);
});

test("the home page trust strip sits with the years of experience", () => {
  const html = readFileSync("public/index.html", "utf8");
  const facts = html.slice(html.indexOf('class="facts"'), html.indexOf('class="facts"') + 400);
  assert.match(facts, /Over 26 years of experience/);
  assert.equal(facts.includes(homeTrustStrip.replaceAll("&", "&amp;")), true);
  assert.equal(facts.includes("NVQ"), false);
  assert.equal(facts.includes(".html"), false);
  assert.doesNotMatch(facts, /[\u2013\u2014]/);
  assert.doesNotMatch(facts, forbidden);
  assert.doesNotMatch(facts, /accredited|certified|approved installer|\bBUS\b/i);
});

test("the heat pump page uses the final wording", () => {
  const html = readFileSync("public/services/heat-pumps/index.html", "utf8");
  assert.equal(html.includes(heatPumpLine), true);
  assert.doesNotMatch(html, /\bMCS\b|accredited|certified|approved installer|\bBUS\b/i);
  assert.doesNotMatch(html, /[\u2013\u2014]/);
  assert.equal(html.includes(".html"), false);
});

test("the chat names that qualification and still refuses the ones not listed", () => {
  const reply = fixedReply("What qualifications do you have?", business) || "";
  assert.equal(reply, qualificationReply());
  assert.match(reply, /City & Guilds qualified plumber/);
  assert.match(reply, /BPEC Level 3 heat pump qualified/);
  assert.match(reply, /BPEC Level 3 Award/);
  assert.match(reply, /Ofqual regulated/);
  assert.match(reply, /non-refrigerant circuits/);
  assert.match(reply, /only qualifications listed/);
  assert.equal(reply.includes("NVQ"), false);
  assert.doesNotMatch(reply, forbidden);
  assert.doesNotMatch(reply, /[\u2013\u2014]/);
  const city = fixedReply("Are you City and Guilds?", business) || "";
  assert.match(city, /City & Guilds qualified/);
  assert.equal(city.includes("NVQ"), false);

  const gasSafe = fixedReply("Are you Gas Safe?", business) || "";
  assert.match(gasSafe, /doesn't list that/);
  assert.match(gasSafe, /gas engineer/);
  assert.doesNotMatch(gasSafe, /Gas Safe/);
  assert.equal(gasSafe.includes("BPEC"), false);
  assert.match(fixedReply("Are you insured?", business) || "", /doesn't list/);
  assert.match(fixedReply("Is he MCS registered?", business) || "", /doesn't list/);

  const instructions = buildInstructions(business, "/about/");
  assert.match(instructions, new RegExp(escapeReg(bpec)));
  assert.match(instructions, /City & Guilds qualified/);
  assert.match(instructions, /only qualifications on the site/);
  assert.match(instructions, /Do not add an NVQ/);
  assert.match(instructions, /Do not say he is insured/);
  assert.doesNotMatch(instructions, /[\u2013\u2014]/);
});

function escapeReg(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
