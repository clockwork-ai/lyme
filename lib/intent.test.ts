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
  assert.match(text || "", /gas engineer/);
  assert.doesNotMatch(text || "", /Gas Safe/);
  assert.match(text || "", /doesn't do boiler or gas work/i);
  assert.equal(fixedReply("Do you do boilers?", business) === business.fixed.emergency, false);
});

test("water from the boiler still says turn the stop tap off", () => {
  const text = fixedReply("My boiler is leaking", business);
  assert.match(text || "", /stop tap/i);
  assert.match(text || "", /gas engineer/);
  assert.doesNotMatch(text || "", /Gas Safe/);
});

test("a quote opens the form, and a price is the published call-out rate", () => {
  assert.match(fixedReply("Can I get a quote?", business) || "", /your name/);
  const price = fixedReply("How much is a new tap?", business) || "";
  assert.match(price, /£60/);
  assert.match(price, /£90/);
  assert.match(price, /£135/);
  assert.match(price, /6pm to 10pm/);
  assert.match(price, /10pm to 7am/);
  assert.match(price, /Saturday after 1pm/);
  assert.match(price, /paid before Callum sets off/);
  assert.match(price, /emergency call-outs only/);
  assert.doesNotMatch(price, /VAT|8am to 10pm|7am to 8am/i);
});

test("qualifications, refrigerant and the guarantee stay inside the site", () => {
  const gas = fixedReply("Are you Gas Safe?", business) || "";
  assert.match(gas, /doesn't list that/);
  assert.match(gas, /gas engineer/);
  assert.doesNotMatch(gas, /Gas Safe/);
  assert.equal((fixedReply("Are you Gas Safe?", business) || "").includes("BPEC"), false);
  assert.match(fixedReply("What qualifications do you have?", business) || "", /City & Guilds qualified/);
  assert.match(fixedReply("What qualifications do you have?", business) || "", /BPEC Level 3 Award/);
  assert.equal((fixedReply("Are you City and Guilds?", business) || "").includes("NVQ"), false);
  assert.match(fixedReply("Can you regas the heat pump?", business) || "", /doesn't do refrigerant/);
  assert.match(fixedReply("Do you give a 12 month guarantee?", business) || "", /aren't written on the site/);
});

test("paying by card is on completion, with no other method named", () => {
  const text = fixedReply("Can I pay by card?", business) || "";
  assert.match(text, /Booked weekday visits: Payment on completion\. Card payments accepted\. For emergency and same-day call-outs, the first hour is paid before Callum sets off/);
  assert.match(text, /Small same-day jobs have no materials deposit/);
  assert.equal(text.includes("£"), false);
  assert.equal(fixedReply("How do I pay?", business), text);
  assert.equal(fixedReply("Do you take cards?", business), text);
  assert.equal(fixedReply("Do you take a deposit?", business), text);
  assert.doesNotMatch(text, /sumup|cash|bank transfer/i);
  assert.match(fixedReply("Can I get a quote?", business) || "", /your name/);
  assert.match(fixedReply("How much is a new tap?", business) || "", /£60/);
});

test("fixed replies have no dash characters and no addresses", () => {
  for (const text of Object.values(business.fixed)) {
    assert.doesNotMatch(text, /[\u2013\u2014]/);
    assert.equal(text.includes("http"), false);
    assert.equal(text.includes("/contact"), false);
  }
});
