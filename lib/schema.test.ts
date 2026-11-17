import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";

function htmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = `${dir}/${name}`;
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return path.endsWith(".html") ? [path] : [];
  });
}

const blocksOf = (html: string) =>
  [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);

// Visible page text: scripts removed, tags removed, entities decoded, spaces collapsed.
function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<\/?(a|b|strong|em|i|span|abbr)\b[^>]*>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

const pages = htmlFiles("public");
const bannedExact = /\b(MCS|BUS|grants?)\b/;
const banned = /\b(Boiler Upgrade|accredited|certified|approved installer|registered|insured|aggregateRating|foundingDate)\b|"award"\s*:|07985|\u2014/i;

test("every JSON-LD block on every page parses", () => {
  for (const page of pages) {
    for (const block of blocksOf(readFileSync(page, "utf8"))) {
      assert.doesNotThrow(() => JSON.parse(block), `${page} has JSON-LD that does not parse`);
    }
  }
});

test("FAQPage questions and answers appear word for word on the page", () => {
  let checked = 0;
  for (const page of pages) {
    const html = readFileSync(page, "utf8");
    const text = visibleText(html);
    for (const block of blocksOf(html)) {
      const data = JSON.parse(block);
      if (data["@type"] !== "FAQPage") continue;
      for (const q of data.mainEntity) {
        assert.ok(text.includes(q.name.replace(/\s+/g, " ")), `${page}: question not visible: ${q.name}`);
        assert.ok(text.includes(q.acceptedAnswer.text.replace(/\s+/g, " ")), `${page}: answer not visible: ${q.acceptedAnswer.text}`);
        checked++;
      }
    }
  }
  assert.ok(checked > 0);
});

test("about page credentials match the visible Qualifications list exactly and appear nowhere else", () => {
  for (const page of pages) {
    const html = readFileSync(page, "utf8");
    const creds = blocksOf(html).flatMap((b) => JSON.parse(b).hasCredential ?? []);
    if (page !== "public/about/index.html") {
      assert.equal(creds.length, 0, `${page} should not carry hasCredential`);
      continue;
    }
    const section = html.match(/<section id="qualifications"[\s\S]*?<\/section>/)![0];
    const visible = [...section.matchAll(/<h3 class="h3">([\s\S]*?)<\/h3>/g)].map((m) => visibleText(m[1]).trim());
    assert.deepEqual(creds.map((c: { name: string }) => c.name), visible);
    const text = visibleText(section);
    for (const c of creds) {
      for (const part of (c.description ?? "").split(". ")) {
        assert.ok(text.includes(part.replace(/\.$/, "")), `credential description not visible: ${part}`);
      }
    }
  }
});

test("the sitewide business block is extended once, with real profiles only", () => {
  for (const page of pages) {
    const html = readFileSync(page, "utf8");
    const businesses = blocksOf(html).map((b) => JSON.parse(b)).filter((d) => d["@type"] === "Plumber");
    if (!businesses.length) continue;
    assert.equal(businesses.length, 1, `${page} has more than one business block`);
    const b = businesses[0];
    assert.equal(b["@id"], "https://lymeplumbing.co.uk/#business");
    assert.equal(b.telephone, "+447846729203");
    assert.deepEqual(b.sameAs, ["https://www.google.com/maps?cid=18273910283615300956"]);
    assert.equal(b.founder?.name, "Callum Broadfoot");
    assert.equal(b.address.streetAddress, undefined);
    assert.equal("review" in b || "aggregateRating" in b, false);
    assert.doesNotMatch(JSON.stringify(b.knowsAbout), /gas|boiler/i);
  }
});

test("service pages carry a Service block tied to the business, described by the meta description", () => {
  for (const page of pages.filter((p) => /^public\/services\/[^/]+\/index\.html$/.test(p))) {
    const html = readFileSync(page, "utf8");
    const meta = visibleText(html.match(/<meta name="description" content="([^"]*)"/)![1]).trim();
    const services = blocksOf(html).map((b) => JSON.parse(b)).filter((d) => d["@type"] === "Service");
    assert.equal(services.length, 1, page);
    assert.equal(services[0].provider["@id"], "https://lymeplumbing.co.uk/#business");
    assert.equal(services[0].description, meta, page);
    assert.ok(blocksOf(html).some((b) => JSON.parse(b)["@type"] === "BreadcrumbList"), `${page} has no BreadcrumbList`);
  }
});

test("no structured data breaks the copy rules", () => {
  for (const page of pages) {
    for (const block of blocksOf(readFileSync(page, "utf8"))) {
      assert.doesNotMatch(block, banned, page);
      assert.doesNotMatch(block, bannedExact, page);
    }
  }
});

test("llms.txt exists with the required sections and numbers", () => {
  const llms = readFileSync("public/llms.txt", "utf8");
  assert.match(llms, /^# Lyme Plumbing & Heating\n\n> /);
  for (const heading of ["## Services", "## Areas covered", "## Contact", "## Qualifications"]) assert.ok(llms.includes(heading), heading);
  assert.ok(llms.includes("07846 729203") && llms.includes("07359 838866"));
  assert.ok(llms.includes("- City & Guilds qualified plumber\n- BPEC Level 3 heat pump qualified\n- G3 qualified for unvented cylinders"));
  assert.doesNotMatch(llms, banned);
  assert.doesNotMatch(llms, bannedExact);
  for (const [, path] of llms.matchAll(/https:\/\/lymeplumbing\.co\.uk\/((?:services|areas)\/[a-z-]+\/)/g)) {
    assert.ok(statSync(`public/${path}index.html`).isFile(), path);
  }
  assert.equal(readFileSync("public/sitemap.xml", "utf8").includes("llms.txt"), false);
  assert.equal(/llms/.test(readFileSync("public/_redirects", "utf8")), false);
});

test("robots.txt keeps the general rules and allows the AI and search crawlers", () => {
  const robots = readFileSync("public/robots.txt", "utf8");
  assert.match(robots, /^User-agent: \*\nAllow: \/\nDisallow: \/photo-frame\/\nDisallow: \/api\/\n/);
  for (const bot of ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "PerplexityBot", "Google-Extended", "Bingbot", "Applebot-Extended"]) {
    assert.ok(robots.includes(`User-agent: ${bot}\nAllow: /\nDisallow: /photo-frame/\nDisallow: /api/\n`), bot);
  }
  assert.ok(robots.includes("Sitemap: https://lymeplumbing.co.uk/sitemap.xml"));
});
