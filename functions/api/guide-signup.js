import {
  FROM,
  TO,
  MAX_BODY,
  parseGuideSignup,
  buildGuideEmail,
  thanksPage,
  signupErrorPage,
} from "../_lib/guide-signup.js";
import { originAllowed } from "../_lib/quote-mail.js";

function wantsJson(request) {
  return (request.headers.get("Accept") || "").includes("application/json");
}

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

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function fail(request, status, message) {
  if (wantsJson(request)) return json({ ok: false, message }, status);
  return html(signupErrorPage(message), status);
}

function ok(request) {
  if (wantsJson(request)) return json({ ok: true }, 200);
  return html(thanksPage(), 200);
}

export async function handleGuideSignup(request, env, createMessage) {
  if (request.method !== "POST") {
    return fail(request, 405, "Use the form on the guides page to sign up.");
  }

  if (!originAllowed(request)) {
    return fail(request, 403, "Please use the form on lymeplumbing.co.uk.");
  }

  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_BODY) {
    return fail(request, 413, "That is too large to send. Please try the form again.");
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return fail(request, 400, "That form did not come through. Please try again.");
  }

  const parsed = parseGuideSignup(formData);
  if (!parsed.ok) return fail(request, parsed.status, parsed.message);
  if (parsed.honeypot) return ok(request);

  if (!env || !env.EMAIL || typeof env.EMAIL.send !== "function") {
    return fail(
      request,
      500,
      "The guide signup is not switched on yet. Please email callum@lymeplumbing.co.uk and he'll add you.",
    );
  }

  try {
    const raw = buildGuideEmail(parsed.fields);
    const message = createMessage(FROM, TO, raw);
    await env.EMAIL.send(message);
  } catch (err) {
    console.error("guide signup email failed", err && err.message ? err.message : "unknown");
    return fail(request, 502, "That did not send just now. Please try again in a few minutes.");
  }

  return ok(request);
}
