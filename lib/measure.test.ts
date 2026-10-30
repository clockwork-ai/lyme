import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";
import { errorPage } from "../functions/_lib/quote-mail.js";
import {
  GSC_VERIFICATION,
  PLAUSIBLE_DOMAIN,
  PLAUSIBLE_SRC,
  buttonLabel,
  clickEventName,
  gscToken,
  headSnippet,
  isThanksPath,
  locationFromClassNames,
  pagePath,
  quoteEventFromRecord,
  quoteRecord,
} from "../public/assets/measure.js";

function htmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = `${dir}/${name}`;
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return path.endsWith(".html") ? [path] : [];
  });
}

const pages = htmlFiles("public");
const snippet = headSnippet();
const exactSnippet = `<!-- Privacy-friendly analytics by Plausible -->
<script async src="https://plausible.io/js/pa-koUHcizG62rO_S0gqTqbm.js"></script>
<script>
  window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};
  plausible.init()
</script>`;

test("the Plausible snippet is the site script and lives once in every head", () => {
  assert.equal(PLAUSIBLE_DOMAIN, "lymeplumbing.co.uk");
  assert.equal(PLAUSIBLE_SRC, "https://plausible.io/js/pa-koUHcizG62rO_S0gqTqbm.js");
  assert.equal(snippet, exactSnippet);
  assert.equal(pages.length > 0, true);
  for (const file of pages) {
    const html = readFileSync(file, "utf8");
    const head = html.slice(html.indexOf("<head>"), html.indexOf("</head>"));
    assert.equal(head.includes(exactSnippet), true, file);
    assert.equal(html.split(exactSnippet).length - 1, 1, file);
    assert.equal(html.split("pa-koUHcizG62rO_S0gqTqbm.js").length - 1, 1, file);
    assert.equal(html.includes("plausible.io/js/script.js"), false, file);
    assert.equal(html.includes("data-domain="), false, file);
    assert.equal(html.includes('type="module" src="') && html.includes("assets/measure.js"), true, file);
  }
});

test("an empty Search Console token renders no meta tag", () => {
  assert.equal(GSC_VERIFICATION, "");
  assert.equal(gscToken(""), "");
  assert.equal(gscToken("   "), "");
  assert.equal(gscToken('<meta name="google-site-verification" content="abc">'), "");
  assert.equal(headSnippet().includes("google-site-verification"), false);
  for (const file of pages) {
    assert.equal(readFileSync(file, "utf8").includes("google-site-verification"), false, file);
  }
  const withToken = headSnippet({ gsc: "abc123XYZ_token" });
  assert.match(withToken, /<meta name="google-site-verification" content="abc123XYZ_token">/);
});

test("call, email and text clicks are named from the link, and quote success waits for thanks", () => {
  assert.equal(clickEventName("tel:+447846729203"), "Phone Call");
  assert.equal(clickEventName("mailto:callum@lymeplumbing.co.uk"), "Email Click");
  assert.equal(clickEventName("sms:+447846729203?&body=Hi"), "Text Click");
  assert.equal(clickEventName("https://wa.me/447846729203"), "");
  assert.equal(clickEventName("https://lymeplumbing.co.uk/contact/"), "");
  assert.equal(locationFromClassNames(["btn btn--call", "callbar"]), "call bar");
  assert.equal(locationFromClassNames(["bar__num", "bar__right", "bar"]), "header");
  assert.equal(locationFromClassNames(["btn btn--ghost", "menu__ctas", "menu"]), "menu");
  assert.equal(locationFromClassNames(["cw-action", "cw-actions"]), "chat");
  assert.equal(locationFromClassNames(["btn", "stack"]), "panel");
  assert.equal(locationFromClassNames(["btn", "cta-row"]), "banner");
  assert.equal(buttonLabel("  Call   07846 729203 \n"), "Call 07846 729203");
  assert.equal(isThanksPath("/thanks/"), true);
  assert.equal(isThanksPath("/thanks"), true);
  assert.equal(isThanksPath("/contact/"), false);
  assert.equal(quoteEventFromRecord(null, "/thanks/"), null);
  assert.equal(quoteEventFromRecord(quoteRecord("/contact/"), "/contact/"), null);
  assert.deepEqual(quoteEventFromRecord(quoteRecord("/contact"), "/thanks/"), {
    name: "Quote Request",
    props: { page: "/contact/", location: "quote form" },
  });
  assert.equal(pagePath("/services/plumbing"), "/services/plumbing/");
  const widget = readFileSync("public/chat/widget.js", "utf8");
  assert.equal(widget.includes('window.plausible("Quote Request"'), true);
  assert.equal(widget.includes("Quote Form Submit"), false);
  let mailto = 0;
  for (const file of pages) {
    const html = readFileSync(file, "utf8");
    assert.equal(/whatsapp|wa\.me/i.test(html), false, file);
    mailto += (html.match(/href="mailto:/g) || []).length;
    assert.equal((html.match(/href="tel:/g) || []).length > 0, true, file);
  }
  assert.equal(mailto > 0, true);
});

test("the quote error page carries the same snippet and does not count as success", () => {
  const html = errorPage("That did not send just now.");
  assert.equal(html.includes(snippet), true);
  assert.match(html, /src="\/assets\/measure\.js"/);
  assert.equal(html.includes("google-site-verification"), false);
  assert.equal(quoteEventFromRecord(quoteRecord("/contact/"), "/api/quote"), null);
});

test("Sunday midnight is not listed as opening hours", () => {
  const sunday = /"dayOfWeek": "Sunday"[\s\S]{0,80}"opens": "00:00"/;
  for (const file of pages) {
    const html = readFileSync(file, "utf8");
    assert.equal(sunday.test(html), false, file);
    assert.match(html, /Sunday, closed/);
    assert.match(html, /"dayOfWeek": "Saturday"[\s\S]{0,40}"opens": "08:00"/);
  }
});
