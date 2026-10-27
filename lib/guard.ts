import type { BusinessConfig } from "./business.ts";

const buckets = new Map<string, { count: number; reset: number }>();

export function clientKey(request: Request): string {
  const connecting = request.headers.get("cf-connecting-ip");
  if (connecting) return connecting.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded
    ? forwarded.split(",")[0]?.trim()
    : request.headers.get("x-real-ip");
  return ip || "unknown";
}

export function takeRateLimit(
  key: string,
  now: number,
  windowMs: number,
  maxRequests: number,
): { ok: true } | { ok: false; retryAfter: number } {
  const current = buckets.get(key);
  if (!current || now >= current.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true };
  }
  if (current.count >= maxRequests) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((current.reset - now) / 1000)) };
  }
  current.count += 1;
  return { ok: true };
}

/** Test helper. The live limiter is process-local on purpose. */
export function resetRateLimits(): void {
  buckets.clear();
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  let pageHost = "";
  let originHost = "";
  try {
    pageHost = new URL(request.url).host;
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const headerHost = request.headers.get("host");
  if (headerHost && headerHost !== originHost) return false;
  return originHost === pageHost;
}

export function knownPage(page: unknown, pages: readonly string[]): string | undefined {
  if (typeof page !== "string") return undefined;
  let path = page.split("?")[0]?.split("#")[0] ?? "";
  if (!path.startsWith("/")) return undefined;
  if (path.length > 1 && !path.endsWith("/")) path += "/";
  return pages.includes(path) ? path : undefined;
}

export type ChatTurn = { role: "user" | "assistant"; content: string };

export function normaliseMessages(
  input: unknown,
  limits: BusinessConfig["limits"],
): { ok: true; messages: ChatTurn[] } | { ok: false; error: string; status: number } {
  if (!Array.isArray(input) || input.length === 0) {
    return { ok: false, status: 400, error: "Send a message and I'll answer." };
  }
  if (input.length > limits.maxMessages) {
    return {
      ok: false,
      status: 400,
      error: "That's as far as this chat goes. Use Get a quote and Callum will take it from there.",
    };
  }
  const messages: ChatTurn[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") {
      return { ok: false, status: 400, error: "I couldn't read that. Try again." };
    }
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") {
      return { ok: false, status: 400, error: "I couldn't read that. Try again." };
    }
    const text = content.replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (role === "user" && text.length > limits.maxUserChars) {
      return {
        ok: false,
        status: 400,
        error: "That message is a bit long. Try a shorter question.",
      };
    }
    messages.push({
      role,
      content: role === "assistant" ? text.slice(0, limits.maxAssistantChars) : text,
    });
  }
  if (!messages.some((message) => message.role === "user")) {
    return { ok: false, status: 400, error: "Send a message and I'll answer." };
  }
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") {
    return { ok: false, status: 400, error: "Send a message and I'll answer." };
  }
  return { ok: true, messages };
}

const WORD_PRICE =
  /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)(?:[\s-](?:and|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred))*\s+pounds?\b/gi;

const MONEY =
  /£\s?\d[\d,]*(?:\.\d+)?(?:\s*billion|\s*(?:\/|a |per )(?:month|mo))?|[$€]\s?\d[\d,]*(?:\.\d+)?(?:\s*(?:\/|a |per )(?:month|mo))?|\bgbp\s?\d[\d,]*(?:\.\d+)?|\b\d[\d,]*(?:\.\d+)?\s*(?:pounds?|quid)\b|\b\d[\d,]*(?:\.\d+)?\s*(?:\/|a |per )(?:month|mo)\b/gi;

/** Turns em and en dashes into plain punctuation. Number ranges become "3 to 5". */
export function scrubDashes(text: string): string {
  return text
    .replace(/(\d)\s*[\u2013\u2014]\s*(\d)/g, "$1 to $2")
    .replace(/\s*[\u2013\u2014]\s*/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/[ \t]{2,}/g, " ");
}

export type PathLinks = {
  quote: string;
  phone: string;
  hosts: string[];
};

const DEFAULT_LINKS: PathLinks = {
  quote: "/contact/",
  phone: "07846 729203",
  hosts: ["lymeplumbing.co.uk", "lymeplumbing.uk"],
};

function wordsFor(raw: string, links: PathLinks): string {
  const trimmed = raw.replace(/[.,;:!?]+$/g, "");
  const trailing = raw.slice(trimmed.length);
  let href = trimmed;
  if (/^www\./i.test(href)) href = `https://${href.slice(4)}`;
  else if (!/^https?:\/\//i.test(href) && !href.startsWith("/") && href.includes(".")) {
    href = `https://${href}`;
  }
  let url: URL;
  try {
    url = new URL(href, "https://lymeplumbing.co.uk");
  } catch {
    return `the page${trailing}`;
  }
  const host = url.hostname.replace(/^www\./, "");
  const path = url.pathname.replace(/\/$/, "") || "/";
  if (path === "/contact") return `the quote form${trailing}`;
  const own = links.hosts.includes(host);
  if (path === "/" && own) return `this site${trailing}`;
  const slug = path.split("/").filter(Boolean).pop()?.replace(/-/g, " ");
  if (slug && (own || href.startsWith("/"))) return `the ${slug} page${trailing}`;
  if (own) return `this site${trailing}`;
  return `the page${trailing}`;
}

/** Replaces a raw URL or page path with words. Phone numbers and ordinary sentences stay. */
export function scrubPaths(text: string, links: PathLinks = DEFAULT_LINKS): string {
  const link =
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]+)\)|(https?:\/\/[^\s<>)\]]+)|(?<!@)\b(?:www\.)?(?:lymeplumbing\.co\.uk|lymeplumbing\.uk)(?:\/[^\s<>)\]]*)?|(^|[\s(])(\/[a-z][a-z0-9-]*(?:\/[a-z0-9-]+)*\/?)/gi;
  return text
    .replace(link, (match, label: string | undefined, href: string | undefined, http: string | undefined, lead: string | undefined, path: string | undefined) => {
      if (match.startsWith("[") && label != null && href != null) {
        return /https?:|www\.|\.html|\.com|wa\.me|\//i.test(label) ? wordsFor(href, links) : label;
      }
      if (http) return wordsFor(http, links);
      if (path) return `${lead ?? ""}${wordsFor(path, links)}`;
      return wordsFor(match, links);
    })
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1");
}

function incompleteMoney(tail: string): boolean {
  if (/(?:£|\$|€|gbp\s?)\d[\d,]*(?:\.\d*)?$/i.test(tail)) return true;
  if (/(?:£|\$|€|gbp\s?)\d[\d,]*(?:\.\d*)?\s+$/i.test(tail)) return true;
  if (/(?:£|\$|€|gbp\s?)\d[\d,]*(?:\.\d*)?\s+(?:a|per)$/i.test(tail)) return true;
  if (/(?:£|\$|€|gbp\s?)\d[\d,]*(?:\.\d*)?\s+(?:a|per)\s+$/i.test(tail)) return true;
  if (/(?:£|\$|€|gbp\s?)\d[\d,]*(?:\.\d*)?\s+(?:a|per)\s+m(?:o(?:n(?:t(?:h)?)?)?)?$/i.test(tail)) return !/month$/i.test(tail);
  if (/(?:£|\$|€|gbp\s?)\d[\d,]*(?:\.\d*)?\s+b(?:i(?:l(?:l(?:i(?:o(?:n)?)?)?)?)?)?$/i.test(tail)) return !/billion$/i.test(tail);
  if (/(?:£|\$|€|gbp\s?)\d[\d,]*(?:\.\d*)?\s*\/\s*m(?:o(?:n(?:t(?:h)?)?)?)?$/i.test(tail)) return !/month$/i.test(tail);
  return false;
}

function holdCut(held: string): number {
  const symbol = held.match(/(?:£|\$|€)$/);
  if (symbol?.index != null) return symbol.index;
  const money = held.match(/(?:£|\$|€|\bgbp\s?)\d[\d,]*(?:\.\d*)?(?:\s+\S+){0,3}\s*$/i);
  if (money?.index != null && incompleteMoney(money[0])) return money.index;
  const slashPrice = held.match(/\d[\d,]*\/$/);
  if (slashPrice?.index != null) return slashPrice.index;
  const range = held.match(/\d\s*[\u2013\u2014]\s*\d*$/);
  if (range?.index != null) return range.index;
  const url = held.match(/https?:\/\/\S*$/i) ?? held.match(/https?:?\/?$/i);
  if (url?.index != null) return url.index;
  const scheme = held.match(/(?:^|\s)(https?|htt|ht|h)$/i);
  if (scheme?.index != null) {
    const at = scheme.index;
    return held[at] === " " || held[at] === "\n" ? at + 1 : at;
  }
  const bare = held.match(/(?<!@)(?:www\.)?(?:lymeplumbing\.co\.uk|lymeplumbing\.uk)(?:\/\S*)?$/i);
  if (bare?.index != null) return bare.index;
  const path = held.match(/\/[a-z0-9][\w./?#=&%-]*$/i);
  if (path?.index != null && !/^\/(?:month|mo)$/i.test(path[0])) return path.index;
  const pathStart = held.match(/(?:^|\s)\/$/);
  if (pathStart?.index != null) {
    const at = pathStart.index;
    return held[at] === " " || held[at] === "\n" ? at + 1 : at;
  }
  const file = held.match(/(?:^|\s)([a-z0-9-]+\.h(?:t(?:m(?:l)?)?)?)$/i);
  if (file?.index != null) {
    const at = file.index;
    return held[at] === " " || held[at] === "\n" ? at + 1 : at;
  }
  const apology = apologyCut(held);
  if (apology != null) return apology;
  const digits = held.match(/\d[\d,]{0,8}$/);
  if (digits?.index != null) return digits.index;
  return held.length;
}

const APOLOGY_TARGETS = [
  "i can't paste links, but you can",
  "i can't give the exact page address, but you can",
];

function apologyCut(held: string): number | null {
  const lower = held.toLowerCase().replace(/\u2019/g, "'");
  const lone = lower.match(/(?:^|\s)(i'?)$/);
  if (lone?.index != null) {
    return lone.index + (lower[lone.index] === " " || lower[lone.index] === "\n" ? 1 : 0);
  }
  const at = lower.lastIndexOf("i can");
  if (at < 0) return null;
  const tail = lower.slice(at);
  if (APOLOGY_TARGETS.some((target) => target.startsWith(tail) && tail.length < target.length)) return at;
  return null;
}

export function scrubPrices(text: string, allowed: readonly string[], standIn: string): string {
  const slots: string[] = [];
  let safe = text;
  const phrases = [...allowed].filter(Boolean).sort((a, b) => b.length - a.length);
  for (const phrase of phrases) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const exact = new RegExp(`${escaped}(?![\\d,.])`, "g");
    safe = safe.replace(exact, (match) => {
      const index = slots.push(match) - 1;
      return `\u0000${index}\u0000`;
    });
  }
  safe = safe.replace(MONEY, standIn).replace(WORD_PRICE, standIn);
  return safe.replace(/\u0000(\d+)\u0000/g, (_match, index: string) => slots[Number(index)] ?? "");
}

function scrubAddressApology(text: string): string {
  return text
    .replace(
      /I can(?:not|['\u2019]t) give(?: you)? the exact (?:page |web )?address,\s*but you can/gi,
      "You can",
    )
    .replace(/I can(?:not|['\u2019]t) paste (?:a |the )?links?,?\s*but you can/gi, "You can")
    .replace(/I can(?:not|['\u2019]t) paste (?:a |the )?links?\.?\s*/gi, "")
    .replace(/[ \t]{2,}/g, " ");
}

function scrubReply(text: string, allowed: readonly string[], standIn: string, links?: PathLinks): string {
  return scrubAddressApology(scrubPaths(scrubDashes(scrubPrices(text, allowed, standIn)), links));
}

/** Holds back a trailing fragment that might still be a price, a dash range, or a path. */
export function createPriceStream(allowed: readonly string[], standIn: string, links?: PathLinks) {
  let held = "";
  const push = (chunk: string) => {
    held += chunk;
    const cut = holdCut(held);
    const ready = held.slice(0, cut);
    held = held.slice(cut);
    return scrubReply(ready, allowed, standIn, links);
  };
  const flush = () => {
    const rest = scrubReply(held, allowed, standIn, links);
    held = "";
    return rest;
  };
  return { push, flush };
}

export function isValidContact(value: string): boolean {
  const text = value.trim();
  if (text.length < 6 || text.length > 120) return false;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return true;
  const digits = text.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15 && /^[+\d][\d\s()-]+$/.test(text);
}

export function cleanLine(value: string, max: number): string {
  return value.replace(/[\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
