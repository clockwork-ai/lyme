import { JOBS, TIMES } from "../functions/_lib/quote-mail.js";
import { business } from "../lib/business.ts";
import {
  clientKey,
  createPriceStream,
  knownPage,
  normaliseMessages,
  sameOrigin,
  takeRateLimit,
  type PathLinks,
} from "../lib/guard.ts";
import { fixedReply } from "../lib/intent.ts";
import { buildInstructions, publicWidget } from "../lib/prompt.ts";

export type ChatEnv = {
  AI?: {
    run: (model: string, input: Record<string, unknown>) => Promise<unknown>;
  };
  AI_MODEL?: string;
};

const links = (): PathLinks => ({
  quote: business.links.quote,
  phone: business.links.phone,
  hosts: business.links.hosts,
});

function json(body: unknown, status = 200, extra?: HeadersInit): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store", ...extra },
  });
}

export function aiReady(env: ChatEnv): boolean {
  return Boolean(env.AI && typeof env.AI.run === "function");
}

function fallback(): string {
  return `Sorry, I can't answer that just now. Ring Callum on ${business.links.phone}, or use Get a quote.`;
}

function pieceFrom(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) return "";
  const payload = trimmed.startsWith("data:") ? trimmed.slice(5).trim() : trimmed;
  if (!payload || payload === "[DONE]") return "";
  if (!payload.startsWith("{")) return payload;
  try {
    const data = JSON.parse(payload) as {
      response?: unknown;
      delta?: unknown;
      choices?: { delta?: { content?: unknown } }[];
    };
    if (typeof data.response === "string") return data.response;
    const choice = data.choices?.[0]?.delta?.content;
    if (typeof choice === "string") return choice;
    if (typeof data.delta === "string") return data.delta;
  } catch {
    return "";
  }
  return "";
}

async function readModel(result: unknown, send: (chunk: string) => void): Promise<void> {
  if (typeof result === "string") {
    send(result);
    return;
  }
  if (result && typeof result === "object" && "response" in result && typeof (result as { response: unknown }).response === "string") {
    send((result as { response: string }).response);
    return;
  }
  const stream = result instanceof ReadableStream
    ? result
    : result instanceof Response
      ? result.body
      : null;
  if (!stream) throw new Error("no-model-output");
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  const take = (block: string) => {
    const piece = pieceFrom(block);
    if (piece) send(piece);
  };
  while (true) {
    const step = await reader.read();
    if (step.done) break;
    buf += decoder.decode(step.value, { stream: true });
    let nl = buf.indexOf("\n");
    while (nl >= 0) {
      take(buf.slice(0, nl));
      buf = buf.slice(nl + 1);
      nl = buf.indexOf("\n");
    }
  }
  buf += decoder.decode();
  if (buf) take(buf);
}

function plain(pull: (send: (chunk: string) => void) => Promise<void>): Response {
  const guard = createPriceStream(business.allowedPrices, business.priceStandIn, links());
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let wrote = false;
      const send = (chunk: string) => {
        const next = guard.push(chunk);
        if (!next) return;
        wrote = true;
        controller.enqueue(encoder.encode(next));
      };
      try {
        await pull(send);
        const tail = guard.flush();
        if (tail) {
          wrote = true;
          controller.enqueue(encoder.encode(tail));
        }
        if (!wrote) controller.enqueue(encoder.encode(fallback()));
      } catch (error) {
        console.error(JSON.stringify({
          event: "chat_model_error",
          name: error instanceof Error ? error.name : "error",
        }));
        if (!wrote) controller.enqueue(encoder.encode(fallback()));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}

export function handleChat(request: Request, env: ChatEnv): Promise<Response> | Response {
  const url = new URL(request.url);
  if (url.pathname !== "/api/chat" && url.pathname !== "/api/chat/") {
    return json({ error: "Not found." }, 404);
  }
  if (request.method === "GET") {
    if (!aiReady(env)) return json({ enabled: false });
    return json({ ...publicWidget(business), jobs: JOBS, times: TIMES });
  }
  if (request.method !== "POST") {
    return json({ error: "Send a message from the chat." }, 405);
  }
  if (!sameOrigin(request)) {
    return json({ error: "Open the chat on the site and try again." }, 403);
  }
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 24_000) {
    return json({ error: "That message is a bit long. Try a shorter question." }, 413);
  }
  const limit = takeRateLimit(
    clientKey(request),
    Date.now(),
    business.limits.windowMs,
    business.limits.maxRequests,
  );
  if (!limit.ok) {
    return json(
      { error: `You've sent quite a few messages. Give it a minute, or ring Callum on ${business.links.phone}.` },
      429,
      { "retry-after": String(limit.retryAfter) },
    );
  }
  return answer(request, env);
}

async function answer(request: Request, env: ChatEnv): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "I couldn't read that. Try again." }, 400);
  }
  if (!body || typeof body !== "object") {
    return json({ error: "I couldn't read that. Try again." }, 400);
  }
  const page = knownPage((body as { page?: unknown }).page, business.pages);
  const messages = normaliseMessages((body as { messages?: unknown }).messages, business.limits);
  if (!messages.ok) return json({ error: messages.error }, messages.status);
  const latest = messages.messages[messages.messages.length - 1]?.content ?? "";
  const direct = fixedReply(latest, business);
  if (direct) return plain(async (send) => { send(direct); });
  if (!aiReady(env)) return plain(async (send) => { send(fallback()); });

  const model = env.AI_MODEL || business.model;
  return plain(async (send) => {
    const result = await env.AI!.run(model, {
      messages: [
        { role: "system", content: buildInstructions(business, page) },
        ...messages.messages,
      ],
      stream: true,
      max_tokens: 320,
      temperature: 0.2,
    });
    await readModel(result, send);
  });
}
