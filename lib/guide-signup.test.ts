import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { handleGuideSignup } from "../functions/api/guide-signup.js";
import {
  CONSENT,
  SUBJECT,
  THANKS,
  TO,
  buildGuideEmail,
  guideEmailText,
  parseGuideSignup,
} from "../functions/_lib/guide-signup.js";

const COPY = {
  heading: "Get the monthly guide",
  line: "One plain answer a month to the questions homeowners ask me most, from bleeding radiators to getting the best out of a heat pump.",
  button: "Send me the guides",
};

function fields(extra: Record<string, string> = {}) {
  const form = new FormData();
  form.set("email", "Ada.Home@example.com");
  form.set("name", "Ada");
  form.set("page", "/guides/");
  form.set("hp", "");
  for (const [key, value] of Object.entries(extra)) form.set(key, value);
  return form;
}

test("a guide signup keeps the email and an optional first name", () => {
  const parsed = parseGuideSignup(fields());
  assert.equal(parsed.ok, true);
  if (!parsed.ok || parsed.honeypot) return;
  assert.equal(parsed.fields.email, "ada.home@example.com");
  assert.equal(parsed.fields.name, "Ada");
  assert.equal(parsed.fields.page, "/guides/");
});

test("a first name can be left blank", () => {
  const parsed = parseGuideSignup(fields({ name: "  " }));
  assert.equal(parsed.ok, true);
  if (!parsed.ok || parsed.honeypot) return;
  assert.equal(parsed.fields.name, "");
});

test("an invalid email is rejected", () => {
  for (const email of ["", "not-an-email", "ada@", "ada@example", "ada @example.com", "a@b.c"]) {
    const parsed = parseGuideSignup(fields({ email }));
    assert.equal(parsed.ok, false, email);
    if (parsed.ok) continue;
    assert.equal(parsed.status, 400);
  }
});

test("a filled honeypot is not stored", () => {
  const parsed = parseGuideSignup(fields({ hp: "https://spam.example" }));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.honeypot, true);
  assert.equal(parsed.fields, null);
});

test("the note to Callum uses a fixed subject and does not email the homeowner", () => {
  const parsed = parseGuideSignup(fields({ page: "/guides/radiators-cold-top-or-bottom/" }));
  assert.equal(parsed.ok, true);
  if (!parsed.ok || parsed.honeypot) return;
  const text = guideEmailText(parsed.fields);
  const raw = buildGuideEmail(parsed.fields);
  const encoded = raw.split("\r\n\r\n").pop()?.replace(/\s+/g, "") || "";
  assert.equal(Buffer.from(encoded, "base64").toString("utf8"), text);
  assert.match(raw, new RegExp("Subject: " + SUBJECT));
  assert.match(raw, new RegExp("(?:^|\\r\\n)To: " + TO.replace(".", "\\.") + "\\r\\n"));
  assert.match(raw, /Reply-To: ada\.home@example\.com/);
  assert.equal(raw.includes("\r\nTo: ada.home@example.com"), false);
  assert.match(text, /Page: \/guides\/radiators-cold-top-or-bottom\//);
  assert.match(text, new RegExp(CONSENT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(text, /No guide has been sent/);
  assert.doesNotMatch(text + raw, /[\u2013\u2014]/);
});

test("a page outside the guides is dropped", () => {
  const parsed = parseGuideSignup(fields({ page: "https://evil.example/steal" }));
  assert.equal(parsed.ok, true);
  if (!parsed.ok || parsed.honeypot) return;
  assert.equal(parsed.fields.page, "/guides/");
});

function post(body: FormData, headers: Record<string, string> = {}) {
  return new Request("http://127.0.0.1:8787/api/guide-signup", {
    method: "POST",
    headers: {
      origin: "http://127.0.0.1:8787",
      accept: "application/json",
      ...headers,
    },
    body,
  });
}

function mailbox() {
  const sent: Array<{ from: string; to: string; raw: string }> = [];
  const env = {
    EMAIL: {
      async send(message: { from: string; to: string; raw: string }) {
        sent.push(message);
      },
    },
  };
  const create = (from: string, to: string, raw: string) => ({ from, to, raw });
  return { sent, env, create };
}

test("a valid signup emails Callum and returns the thank-you", async () => {
  const box = mailbox();
  const response = await handleGuideSignup(post(fields()), box.env, box.create);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(box.sent.length, 1);
  assert.equal(box.sent[0]?.to, TO);
  assert.match(box.sent[0]?.raw || "", /Subject: New guide signup/);
});

test("the handler rejects an invalid email and a honeypot hit", async () => {
  const box = mailbox();
  const invalid = await handleGuideSignup(post(fields({ email: "nope" })), box.env, box.create);
  assert.equal(invalid.status, 400);
  const invalidBody = await invalid.json();
  assert.equal(invalidBody.ok, false);
  assert.match(invalidBody.message, /does not look right/);

  const honey = await handleGuideSignup(post(fields({ hp: "bot" })), box.env, box.create);
  assert.equal(honey.status, 200);
  assert.deepEqual(await honey.json(), { ok: true });
  assert.equal(box.sent.length, 0);
});

test("a browser without script still gets the thank-you page", async () => {
  const box = mailbox();
  const response = await handleGuideSignup(
    post(fields(), { accept: "text/html" }),
    box.env,
    box.create,
  );
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, new RegExp(THANKS));
  assert.match(html, /noindex/);
  assert.equal(box.sent.length, 1);
});

test("a preview hostname is refused and a missing binding does not pretend success", async () => {
  const box = mailbox();
  const preview = new Request("https://preview.lyme-plumbing.workers.dev/api/guide-signup", {
    method: "POST",
    headers: {
      origin: "https://preview.lyme-plumbing.workers.dev",
      accept: "application/json",
    },
    body: fields(),
  });
  const refused = await handleGuideSignup(preview, box.env, box.create);
  assert.equal(refused.status, 403);
  assert.equal(box.sent.length, 0);

  const local = post(fields());
  const off = await handleGuideSignup(local, {}, box.create);
  assert.equal(off.status, 500);
  assert.equal(box.sent.length, 0);
});

test("the guides pages show the signup, the consent line and the privacy link", () => {
  const index = readFileSync("public/guides/index.html", "utf8");
  const article = readFileSync("public/guides/radiators-cold-top-or-bottom/index.html", "utf8");
  for (const html of [index, article]) {
    assert.match(html, new RegExp(COPY.heading));
    assert.match(html, new RegExp(COPY.line.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(html, new RegExp(COPY.button));
    assert.match(html, new RegExp(CONSENT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(html, /action="\/api\/guide-signup"/);
    assert.match(html, /name="hp"/);
    assert.match(html, /name="email"/);
    assert.match(html, /for="guide-email"/);
    assert.match(html, /You're on the list/);
    assert.doesNotMatch(html, /[\u2013\u2014]/);
    assert.doesNotMatch(html, /\b(MCS|accredited|certified|approved installer)\b|\bBUS\b/i);
  }
  assert.match(index, /href="\.\.\/privacy\/"/);
  assert.match(article, /form--compact/);
  assert.match(article, /href="\.\.\/\.\.\/privacy\/"/);
  assert.match(readFileSync("src/worker.js", "utf8"), /\/api\/guide-signup/);
  assert.match(readFileSync("public/privacy/index.html", "utf8"), /monthly guide/);
});
