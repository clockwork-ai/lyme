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

// /photo-frame/ is a private on-phone tool, not a public page.
const pages = htmlFiles("public").filter((file) => !file.includes("/photo-frame/"));
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
  assert.equal(clickEventName("https://wa.me/447359838866"), "WhatsApp Click");
  assert.equal(clickEventName("https://wa.me/447359838866?text=Hi%20Callum"), "WhatsApp Click");
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
    const waLinks = html.match(/https:\/\/wa\.me\/[^"'\s]*/g) || [];
    assert.equal(waLinks.length > 0, true, file);
    for (const link of waLinks) {
      assert.match(link, /^https:\/\/wa\.me\/447359838866(?:\?|$)/, `${file} ${link}`);
      assert.equal(/447846729203|447985379605|07846|07985|07359/.test(link), false, `${file} ${link}`);
    }
    assert.equal(html.includes("07359"), false, file);
    assert.equal(html.includes("07985"), false, file);
    assert.match(html, /07846 729203/, file);
    const tels = html.match(/href="tel:[^"]*"/g) || [];
    assert.equal(tels.length > 0, true, file);
    for (const tel of tels) assert.equal(tel, 'href="tel:+447846729203"', `${file} ${tel}`);
    mailto += (html.match(/href="mailto:/g) || []).length;
  }
  assert.equal(mailto > 0, true);
  assert.match(widget, /https:\/\/wa\.me\/447359838866/);
  assert.equal(/wa\.me\/(?!447359838866)/.test(widget), false);
});

test("the quote error page carries the same snippet and does not count as success", () => {
  const html = errorPage("That did not send just now.");
  assert.equal(html.includes(snippet), true);
  assert.match(html, /src="\/assets\/measure\.js"/);
  assert.equal(html.includes("google-site-verification"), false);
  assert.equal(quoteEventFromRecord(quoteRecord("/contact/"), "/api/quote"), null);
  assert.match(html, /https:\/\/wa\.me\/447359838866/);
  assert.match(html, /href="tel:\+447846729203"/);
  assert.equal(html.includes("07359"), false);
  assert.equal(html.includes("07985"), false);
});

test("opening hours are 7am, with Sunday emergencies 8am to 10pm", () => {
  const midnight = /"dayOfWeek": "Sunday"[\s\S]{0,120}"opens": "00:00"/;
  for (const file of pages) {
    const html = readFileSync(file, "utf8");
    assert.equal(midnight.test(html), false, file);
    assert.equal(html.includes("Sunday, closed"), false, file);
    assert.equal(html.includes("8am to 6pm"), false, file);
    assert.match(html, /Sunday, emergencies only, 8am to 10pm/);
    assert.match(html, /"dayOfWeek": "Sunday"[\s\S]{0,80}"opens": "08:00"/);
    assert.match(html, /"closes": "22:00"/);
    assert.match(html, /"dayOfWeek": \["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"\][\s\S]{0,40}"opens": "07:00"/);
    assert.match(html, /"dayOfWeek": "Saturday"[\s\S]{0,40}"opens": "07:00"/);
    assert.match(html, /"closes": "13:00"/);
    assert.match(html, /"closes": "18:00"/);
  }
});
