import { handleQuote } from "../functions/api/quote.js";
import { handleChat } from "../server/chat.ts";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/quote" || url.pathname === "/api/quote/") {
      return handleQuote(request, env);
    }
    if (url.pathname === "/api/chat" || url.pathname === "/api/chat/") {
      return handleChat(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
