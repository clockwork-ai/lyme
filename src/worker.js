import { EmailMessage } from "cloudflare:email";
import { handleQuote } from "../functions/api/quote.js";
import { handleGuideSignup } from "../functions/api/guide-signup.js";
import { handleChat } from "../server/chat.ts";
import { canonicalRedirectTarget } from "../lib/canonical.ts";
import { forcedNotFoundStatus } from "../lib/not-found.ts";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/quote" || url.pathname === "/api/quote/") {
      return handleQuote(request, env, ctx);
    }
    if (url.pathname === "/api/guide-signup" || url.pathname === "/api/guide-signup/") {
      return handleGuideSignup(request, env, (from, to, raw) => new EmailMessage(from, to, raw));
    }
    if (url.pathname === "/api/chat" || url.pathname === "/api/chat/") {
      return handleChat(request, env);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    const forced = forcedNotFoundStatus(url.pathname, assetResponse.status);
    if (forced) {
      let page = assetResponse;
      if (page.status !== 200) {
        await page.body?.cancel();
        const fileUrl = new URL(request.url);
        fileUrl.pathname = "/404";
        fileUrl.search = "";
        page = await env.ASSETS.fetch(new Request(fileUrl, { method: "GET" }));
      }
      const headers = new Headers(page.headers);
      if (request.method === "HEAD") await page.body?.cancel();
      return new Response(request.method === "HEAD" ? null : page.body, {
        status: forced,
        statusText: "Not Found",
        headers,
      });
    }

    const target = canonicalRedirectTarget(
      request.url,
      request.method,
      assetResponse.status,
      assetResponse.headers.get("Location"),
    );
    if (!target) return assetResponse;

    await assetResponse.body?.cancel();
    return Response.redirect(target, 301);
  },
};
