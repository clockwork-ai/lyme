/**
 * Monthly guide signup checks and the plain email the Worker sends.
 * No Cloudflare imports here, so it can be tested on its own.
 * Homeowners are not emailed. The note goes to Callum's inbox only.
 */

import { headSnippet } from "../../public/assets/measure.js";
import { FROM, TO, FROM_HEADER, bytesToBase64 } from "./quote-mail.js";

export const SUBJECT = "New guide signup";
export const CONSENT =
  "One short guide a month from Callum at Lyme. No spam, and you can unsubscribe any time.";
export const THANKS = "You're on the list. I'll send one short guide a month, and nothing else.";

const MAX_BODY = 16 * 1024;

export { MAX_BODY };

function cleanHeader(value) {
  return String(value || "").replace(/[\r\n]+/g, " ").trim();
}

function emailOk(value) {
  return value.length <= 120 && /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(value);
}

export function guidePage(value) {
  const path = cleanHeader(value);
  if (/^\/guides\/[a-z0-9/-]{0,80}$/.test(path) && path.endsWith("/")) return path;
  return "/guides/";
}

function wrap76(b64) {
  return b64.replace(/.{1,76}/g, "$&\r\n").replace(/\r\n$/, "");
}

/**
 * @param {FormData} formData
 */
export function parseGuideSignup(formData) {
  const field = (name) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };

  if (cleanHeader(field("hp"))) {
    return { ok: true, honeypot: true, fields: null };
  }

  const email = cleanHeader(field("email")).toLowerCase();
  const name = cleanHeader(field("name"));
  const page = guidePage(field("page"));

  if (!email) {
    return { ok: false, status: 400, message: "Please add your email address." };
  }
  if (!emailOk(email)) {
    return { ok: false, status: 400, message: "That email address does not look right." };
  }
  if (name.length > 40) {
    return { ok: false, status: 400, message: "Please keep your first name shorter." };
  }

  return {
    ok: true,
    honeypot: false,
    fields: { email, name, page },
  };
}

export function guideEmailText(fields) {
  return [
    "New guide signup from lymeplumbing.co.uk",
    "",
    "Email: " + fields.email,
    "First name: " + (fields.name || "(not given)"),
    "Page: " + fields.page,
    "Consent: " + CONSENT,
    "",
    "No guide has been sent. This email is only so you can see who signed up.",
  ].join("\r\n");
}

export function buildGuideEmail(fields) {
  const text = guideEmailText(fields);

  const id = crypto.randomUUID() + "@lymeplumbing.co.uk";
  const lines = [
    "From: " + FROM_HEADER,
    "To: " + TO,
    "Reply-To: " + fields.email,
    "Subject: " + SUBJECT,
    "Message-ID: <" + id + ">",
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(bytesToBase64(new TextEncoder().encode(text))),
  ];
  return lines.join("\r\n") + "\r\n";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function resultPage(title, heading, message) {
  const safe = escapeHtml(message);
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)} | Lyme Plumbing &amp; Heating</title>
${headSnippet()}
<link rel="stylesheet" href="/assets/fonts/fonts.css">
<link rel="stylesheet" href="/assets/scrollcraft.css">
<link rel="stylesheet" href="/assets/site.css">
</head>
<body>
<main id="main">
<section class="phead ground-dark">
  <div class="wrap">
    <h1 class="h1">${escapeHtml(heading)}</h1>
    <p class="lede">${safe}</p>
    <div class="cta-row">
      <a class="btn btn--quote" href="/guides/#guide-signup">Back to the guides</a>
    </div>
  </div>
</section>
</main>
<script type="module" src="/assets/measure.js"></script>
</body>
</html>`;
}

export function thanksPage() {
  return resultPage("You're on the list", "You're on the list", THANKS);
}

export function signupErrorPage(message) {
  return resultPage("Signup not sent", "That didn't send", message);
}

export { FROM, TO, FROM_HEADER };
