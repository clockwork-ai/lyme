import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const html = readFileSync("public/privacy/index.html", "utf8");

test("the privacy page explains AI call answering and names the processors", () => {
  assert.match(html, /AI call answering and recording/);
  assert.match(html, /Jess/);
  assert.match(html, /ElevenLabs/);
  assert.match(html, /Twilio/);
  assert.match(html, /recorded/);
  assert.match(html, /transcript/);
  assert.match(html, /If you want a person/);
  assert.match(html, /If you do not want the call recorded, tell me on the call or afterwards\. I will delete any recording or transcript I hold when you ask\. I cannot promise the recording stops the moment you say so\./);
  assert.doesNotMatch(html, /say that at the start of the call/);
  for (const name of ["Twilio", "ElevenLabs", "Stripe", "Cloudflare", "Google Business Profile", "Plausible", "Clockwork Jobs", "Meta"]) {
    assert.equal(html.includes(name), true, name);
  }
  assert.match(html, /United States/);
  assert.match(html, /European Union/);
  assert.match(html, /lawful basis/);
  assert.match(html, /before a contract/);
  assert.match(html, /legitimate interest/);
  assert.match(html, /because you consented/);
  assert.match(html, /6 years/);
  assert.match(html, /12 months/);
  assert.match(html, /2 years/);
  assert.equal(/sumup/i.test(html), false);
  assert.equal(html.includes("07985 379605"), false);
  assert.equal(html.includes("07359"), false);
  assert.equal(html.includes("07846 729203"), true);
  assert.match(html, /https:\/\/wa\.me\/447359838866/);
  assert.doesNotMatch(html, /[\u2013\u2014]/);
  assert.equal(html.includes("£"), false);
});

test("the privacy page lists the UK GDPR rights", () => {
  for (const right of ["access", "rectification", "erasure", "restriction", "objection", "portability"]) {
    assert.equal(html.includes(right), true, right);
  }
  assert.match(html, /withdraw consent/);
  assert.match(html, /Information Commissioner's Office \(ico\.org\.uk\)/);
  assert.match(html, /monthly guide/);
});
