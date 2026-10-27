import { handleQuote } from "../functions/api/quote.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/quote" || url.pathname === "/api/quote/") {
      return handleQuote(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
