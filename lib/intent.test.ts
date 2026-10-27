import assert from "node:assert/strict";
import { test } from "node:test";
import { business } from "./business.ts";
import { fixedReply } from "./intent.ts";

test("a leak tells them to turn the stop tap off and ring", () => {
  const text = fixedReply("I've got a leak in the kitchen", business);
  assert.match(text || "", /stop tap/i);
  assert.match(text || "", /07846 729203/);
  assert.doesNotMatch(text || "", /£/);
});

test("a boiler question is declined", () => {
  const text = fixedReply("Do you do boilers?", business);
  assert.match(text || "", /Gas Safe/);
  assert.match(text || "", /doesn't do boiler or gas work/i);
  assert.equal(fixedReply("Do you do boilers?", business) === business.fixed.emergency, false);
});

test("water from the boiler still says turn the stop tap off", () => {
  const text = fixedReply("My boiler is leaking", business);
  assert.match(text || "", /stop tap/i);
  assert.match(text || "", /Gas Safe/);
});

test("a quote opens the form, and a price is not a number", () => {
  assert.match(fixedReply("Can I get a quote?", business) || "", /your name/);
  const price = fixedReply("How much is a new tap?", business) || "";
  assert.match(price, /isn't a price list/);
  assert.equal(price.includes("£"), false);
});

test("qualifications, refrigerant and the guarantee stay inside the site", () => {
  assert.match(fixedReply("Are you Gas Safe?", business) || "", /doesn't list Gas Safe/);
  assert.equal((fixedReply("Are you Gas Safe?", business) || "").includes("BPEC"), false);
  assert.match(fixedReply("What qualifications do you have?", business) || "", /City & Guilds qualified/);
  assert.match(fixedReply("What qualifications do you have?", business) || "", /BPEC Level 3 Award/);
  assert.equal((fixedReply("Are you City and Guilds?", business) || "").includes("NVQ"), false);
  assert.match(fixedReply("Can you regas the heat pump?", business) || "", /doesn't do refrigerant/);
  assert.match(fixedReply("Do you give a 12 month guarantee?", business) || "", /aren't written on the site/);
});

test("fixed replies have no dash characters and no addresses", () => {
  for (const text of Object.values(business.fixed)) {
    assert.doesNotMatch(text, /[\u2013\u2014]/);
    assert.equal(text.includes("http"), false);
    assert.equal(text.includes("/contact"), false);
  }
});
