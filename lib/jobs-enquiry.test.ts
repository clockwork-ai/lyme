// The quote form passes each enquiry on to Clockwork Jobs with the business key, and never
// breaks the form when the app is off, slow or down.
import { test } from "node:test";
import assert from "node:assert/strict";
import { enquiryPayload, sendToJobs } from "../functions/_lib/jobs-enquiry.js";

const fields = { name: "Tess Tapley", phone: "07700 900321", email: "", postcode: "SK6 4AB", job: "Plumbing jobs", message: "Kitchen tap dripping", bestTime: "Evenings" };

test("no key: switched off, nothing sent", async () => {
  let called = false;
  assert.equal(await sendToJobs(fields, {}, async () => { called = true; return new Response("{}"); }), "off");
  assert.equal(called, false);
});

test("with a key: posts the enquiry, signed", async () => {
  let seen: { url: string; init: RequestInit } | null = null;
  const r = await sendToJobs(fields, { JOBS_ENQUIRY_KEY: "lyme.secret", JOBS_APP_URL: "https://jobs.example/" }, async (url: string, init: RequestInit) => { seen = { url, init }; return new Response("{}", { status: 200 }); });
  assert.equal(r, "sent");
  assert.equal(seen!.url, "https://jobs.example/api/enquiries");
  assert.equal((seen!.init.headers as Record<string, string>).authorization, "Bearer lyme.secret");
  assert.deepEqual(JSON.parse(String(seen!.init.body)), { ...enquiryPayload(fields), source: "Website form" });
});

test("the How soon answer goes to the app", () => {
  assert.equal(enquiryPayload({ ...fields, urgency: "Today, it's urgent" }).urgency, "Today, it's urgent");
  assert.equal(enquiryPayload(fields).urgency, "");
});

test("app says no or is down: reported, never thrown", async () => {
  assert.equal(await sendToJobs(fields, { JOBS_ENQUIRY_KEY: "k" }, async () => new Response("{}", { status: 401 })), "failed: 401");
  assert.equal(await sendToJobs(fields, { JOBS_ENQUIRY_KEY: "k" }, async () => { throw new TypeError("fetch failed"); }), "failed: TypeError");
});
