import { handleQuote } from "../functions/api/quote.js";
import { handleChat } from "../server/chat.ts";
import { handleReviews } from "../functions/api/reviews.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/quote" || url.pathname === "/api/quote/") {
      return handleQuote(request, env);
    }
    if (url.pathname === "/api/chat" || url.pathname === "/api/chat/") {
      return handleChat(request, env);
    }
    if (url.pathname.startsWith("/api/reviews/")) {
      return handleReviews(request, env, ctx);
    }
    return env.ASSETS.fetch(request);
  },
};
