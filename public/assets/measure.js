/**
 * Cookieless measurement for Lyme Plumbing & Heating.
 *
 * PLAUSIBLE_SRC is the site-specific Plausible script. The address is issued
 * for lymeplumbing.co.uk, so the tag has no data-domain. After changing it,
 * run `npm run measure` so every page is rewritten from this file.
 *
 * GSC_VERIFICATION is the Google Search Console HTML token only (the content
 * value, not the whole meta tag). Leave it as an empty string until Search
 * Console gives you one. An empty or invalid value writes no meta tag.
 * Do not invent a token.
 */

export const PLAUSIBLE_DOMAIN = "lymeplumbing.co.uk";
export const PLAUSIBLE_SRC = "https://plausible.io/js/pa-koUHcizG62rO_S0gqTqbm.js";
export const GSC_VERIFICATION = "";

export const QUOTE_STORAGE_KEY = "lyme-quote";

const TOKEN = /^[A-Za-z0-9_-]{1,200}$/;

export function gscToken(value) {
  const token = String(value == null ? GSC_VERIFICATION : value).trim();
  if (!token || !TOKEN.test(token)) return "";
  return token;
}

function attr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

export function headSnippet(config) {
  const src = config && config.src != null ? config.src : PLAUSIBLE_SRC;
  const token = gscToken(config && "gsc" in config ? config.gsc : GSC_VERIFICATION);
  const lines = [];
  if (token) {
    lines.push(`<meta name="google-site-verification" content="${attr(token)}">`);
  }
  lines.push("<!-- Privacy-friendly analytics by Plausible -->");
  lines.push(`<script async src="${attr(src)}"></script>`);
  lines.push("<script>");
  lines.push(
    "  window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};",
  );
  lines.push("  plausible.init()");
  lines.push("</script>");
  return lines.join("\n");
}

export function pagePath(pathname) {
  const path = pathname || "/";
  if (path === "/") return "/";
  return path.endsWith("/") ? path : `${path}/`;
}

export function isThanksPath(pathname) {
  return /\/thanks\/?$/.test(pathname || "");
}

export function clickEventName(href) {
  const value = String(href || "").trim().toLowerCase();
  if (value.startsWith("tel:")) return "Phone Call";
  if (value.startsWith("mailto:")) return "Email Click";
  if (value.startsWith("sms:")) return "Text Click";
  return "";
}

const LOCATION_RULES = [
  ["callbar", "call bar"],
  ["cw-actions", "chat"],
  ["cw-chat", "chat"],
  ["menu__ctas", "menu"],
  ["menu", "menu"],
  ["bar__num", "header"],
  ["bar__right", "header"],
  ["bar", "header"],
  ["big-ctas", "contact"],
  ["side__card", "sidebar"],
  ["side", "sidebar"],
  ["foot", "footer"],
  ["cta-row", "banner"],
  ["stack", "panel"],
];

export function locationFromClassNames(classNames) {
  for (const value of classNames || []) {
    const tokens = String(value).split(/\s+/);
    for (const [token, label] of LOCATION_RULES) {
      if (tokens.includes(token)) return label;
    }
  }
  return "page";
}

export function buttonLabel(text) {
  const label = String(text || "").replace(/\s+/g, " ").trim();
  return label.slice(0, 80);
}

export function quoteRecord(pathname) {
  return JSON.stringify({ page: pagePath(pathname), location: "quote form" });
}

export function quoteEventFromRecord(raw, pathname) {
  if (!raw || !isThanksPath(pathname)) return null;
  let stored;
  try {
    stored = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!stored || typeof stored !== "object") return null;
  const page = typeof stored.page === "string" && stored.page ? stored.page : pagePath(pathname);
  const location = typeof stored.location === "string" && stored.location ? stored.location : "quote form";
  return { name: "Quote Request", props: { page, location } };
}

function classNamesFrom(el) {
  const names = [];
  let node = el;
  while (node && node.nodeType === 1 && node !== document.body) {
    if (typeof node.className === "string" && node.className) names.push(node.className);
    node = node.parentElement;
  }
  return names;
}

function track(name, props) {
  try {
    if (typeof window.plausible === "function") window.plausible(name, { props });
  } catch {
    /* A failed analytics call must not stop the link or the form. */
  }
}

function storageGet() {
  try {
    return sessionStorage.getItem(QUOTE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storageSet(value) {
  try {
    if (value == null) sessionStorage.removeItem(QUOTE_STORAGE_KEY);
    else sessionStorage.setItem(QUOTE_STORAGE_KEY, value);
  } catch {
    /* Private mode can block storage. The form still posts. */
  }
}

if (typeof document !== "undefined") {
  const pending = quoteEventFromRecord(storageGet(), location.pathname);
  storageSet(null);
  if (pending) track(pending.name, pending.props);

  document.addEventListener("click", (event) => {
    const raw = event.target;
    const target = raw && raw.nodeType === 1 ? raw : raw && raw.parentElement;
    const link = target && target.closest ? target.closest("a[href]") : null;
    if (!link) return;
    const name = clickEventName(link.getAttribute("href"));
    if (!name) return;
    const locationLabel = locationFromClassNames(classNamesFrom(link));
    const button = buttonLabel(link.textContent) || locationLabel;
    track(name, { page: pagePath(location.pathname), location: locationLabel, button });
  });

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!form || form.id !== "quote" || event.defaultPrevented) return;
    storageSet(quoteRecord(location.pathname));
  });
}
