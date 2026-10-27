import assert from "node:assert/strict";
import { test } from "node:test";
import { originAllowed, parseSubmission } from "../functions/_lib/quote-mail.js";

test("a chat quote uses the same checks as the contact form", async () => {
  const form = new FormData();
  form.set("name", "Ada Stone");
  form.set("phone", "07700 900123");
  form.set("email", "ada@example.com");
  form.set("postcode", "SK6 8AA");
  form.set("job", "Plumbing jobs");
  form.set("message", "From the site chat.\n\nDripping kitchen tap.");
  form.set("best_time", "Morning");
  form.set("consent", "yes");
  form.set("hp", "");
  const parsed = await parseSubmission(form);
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.honeypot, false);
    assert.match(parsed.fields.message, /From the site chat/);
    assert.equal(parsed.fields.job, "Plumbing jobs");
  }
});

test("the quote form still refuses a workers.dev preview", () => {
  const preview = new Request("https://chat.lyme-plumbing.workers.dev/api/quote", {
    method: "POST",
    headers: { origin: "https://chat.lyme-plumbing.workers.dev" },
  });
  assert.equal(originAllowed(preview), false);
  const local = new Request("http://127.0.0.1:8787/api/quote", {
    method: "POST",
    headers: { origin: "http://127.0.0.1:8787" },
  });
  assert.equal(originAllowed(local), true);
  const live = new Request("https://lymeplumbing.co.uk/api/quote", {
    method: "POST",
    headers: { origin: "https://lymeplumbing.co.uk" },
  });
  assert.equal(originAllowed(live), true);
});
