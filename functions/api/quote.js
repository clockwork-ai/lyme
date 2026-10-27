import { EmailMessage } from "cloudflare:email";
import {
  FROM,
  TO,
  LIMITS,
  originAllowed,
  parseSubmission,
  buildRawEmail,
  errorPage,
} from "../_lib/quote-mail.js";

function html(body, status) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function fail(status, message) {
  return html(errorPage(message), status);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!originAllowed(request)) {
    return fail(403, "Please use the form on lymeplumbing.co.uk. If you are in a hurry, call or text 07846 729203.");
  }

  const length = Number(request.headers.get("content-length") || 0);
  if (length > LIMITS.bodyBytes) {
    return fail(413, "That is too large to send. Please use up to 4 photos, 3MB each, or text them to 07846 729203.");
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return fail(400, "That form did not come through. Please try again, or call or text 07846 729203.");
  }

  const parsed = await parseSubmission(formData);
  if (!parsed.ok) return fail(parsed.status, parsed.message);

  const thanks = new URL("/thanks/", request.url);
  if (parsed.honeypot) return Response.redirect(thanks.toString(), 303);

  if (!env.EMAIL || typeof env.EMAIL.send !== "function") {
    return fail(500, "The quote form is not switched on yet. Please call or text 07846 729203 and Callum will take the details.");
  }

  try {
    const raw = buildRawEmail(parsed.fields, parsed.files);
    const message = new EmailMessage(FROM, TO, raw);
    await env.EMAIL.send(message);
  } catch (err) {
    console.error("quote email failed", err && err.message ? err.message : "unknown");
    return fail(502, "That did not send just now. Please call or text 07846 729203, or try the form again in a few minutes.");
  }

  return Response.redirect(thanks.toString(), 303);
}

export async function onRequestGet() {
  return fail(405, "Use the quote form on the contact page to get in touch.");
}
