import { handleQuote } from "../functions/api/quote.js";
import { handleChat } from "../server/chat.ts";
import { canonicalRedirectTarget } from "../lib/canonical.ts";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/quote" || url.pathname === "/api/quote/") {
      return handleQuote(request, env);
    }
    if (url.pathname === "/api/chat" || url.pathname === "/api/chat/") {
      return handleChat(request, env);
    }

    const assetResponse = await env.ASSETS.fetch(request);
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
