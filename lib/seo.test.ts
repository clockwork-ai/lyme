import assert from "node:assert/strict";
import { createServer, request as httpRequest, type Server } from "node:http";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { forcedNotFoundStatus } from "./not-found.ts";
import type { AddressInfo } from "node:net";
import { test } from "node:test";

const rules = readFileSync("public/_redirects", "utf8")
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"))
  .map((line) => {
    const parts = line.split(/\s+/);
    return { from: parts[0], to: parts[1], code: parts[2] };
  });

const redirects: Array<[string, string]> = [
  ["/services/heatpumps/", "/services/heat-pumps/"],
  ["/services/hot-water-cylinder/", "/services/unvented-cylinders/"],
  ["/services/hot-water-cylinders/", "/services/unvented-cylinders/"],
  ["/services/underfloorheating/", "/services/underfloor-heating/"],
  ["/services/radiator/", "/services/radiators/"],
  ["/services/emergency/", "/services/emergency-plumber/"],
  ["/services/emergency-plumbing/", "/services/emergency-plumber/"],
  ["/services/air-source-heat-pump/", "/services/heat-pumps/"],
  ["/services/air-source-heat-pumps/", "/services/heat-pumps/"],
  ["/services/ashp/", "/services/heat-pumps/"],
  ["/services/ufh/", "/services/underfloor-heating/"],
  ["/heat-pumps/", "/services/heat-pumps/"],
  ["/unvented-cylinders/", "/services/unvented-cylinders/"],
  ["/plumbing/", "/services/plumbing/"],
  ["/review/", "/reviews/"],
  ["/privacy-policy/", "/privacy/"],
  ["/thank-you/", "/thanks/"],
  ["/area/high-lane/", "/areas/high-lane/"],
  ["/stockport/", "/areas/stockport/"],
  ["/marple/", "/areas/marple/"],
  ["/bramhall/", "/areas/bramhall/"],
  ["/poynton/", "/areas/poynton/"],
  ["/cheadle/", "/areas/cheadle/"],
  ["/cheadle-hulme/", "/areas/cheadle-hulme/"],
  ["/new-mills/", "/areas/new-mills/"],
  ["/wilmslow/", "/areas/wilmslow/"],
  ["/hazel-grove/", "/areas/hazel-grove/"],
];

function assetFile(pathname: string): string | null {
  const rel = pathname.replace(/^\//, "");
  const candidates = [`public/${rel}`, `public/${rel.replace(/\/$/, "")}/index.html`, `public/${rel}.html`];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function start(): Promise<Server> {
  const server = createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const rule = rules.find((item) => item.from === url.pathname);
    if (rule?.code === "301") {
      res.writeHead(301, { Location: rule.to });
      res.end();
      return;
    }
    const file = assetFile(rule?.code === "200" ? rule.to : url.pathname);
    const assetStatus = file ? 200 : 404;
    const status = forcedNotFoundStatus(url.pathname, assetStatus) ?? assetStatus;
    const type = file?.endsWith(".svg") ? "image/svg+xml" : "text/html; charset=utf-8";
    res.writeHead(status, { "content-type": type });
    res.end(readFileSync(file ?? "public/404.html"));
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function get(port: number, path: string): Promise<{ status: number; location: string; body: string }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest({ hostname: "127.0.0.1", port, path, method: "GET" }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        resolve({
          status: res.statusCode ?? 0,
          location: String(res.headers.location ?? ""),
          body: Buffer.concat(chunks).toString("utf8"),
        });
      });
    });
    req.on("error", reject);
    req.end();
  });
}

test("redirect targets exist and return 200, and the old paths return 301", async () => {
  const server = await start();
  const { port } = server.address() as AddressInfo;
  try {
    for (const [from, to] of redirects) {
      for (const path of [from, from.replace(/\/$/, "")]) {
        const first = await get(port, path);
        assert.equal(first.status, 301, path);
        assert.equal(first.location, to, path);
        const second = await get(port, first.location);
        assert.equal(second.status, 200, first.location);
        assert.equal(second.location, "", first.location);
      }
    }
    for (const path of ["/services/boiler/", "/services/boiler", "/services/boilers/", "/services/gas/", "/services/heating/"]) {
      assert.equal((await get(port, path)).status, 404, path);
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
});

test("404 and thanks carry noindex and are absent from the sitemap", async () => {
  for (const file of ["public/404.html", "public/404/index.html", "public/thanks/index.html"]) {
    const html = readFileSync(file, "utf8");
    assert.match(html, /<meta name="robots" content="noindex, follow">/, file);
    assert.equal(/\u2013|\u2014/.test(html), false, file);
  }
  for (const file of ["public/404.html", "public/404/index.html"]) {
    const html = readFileSync(file, "utf8");
    assert.equal(/<link rel="canonical"/i.test(html), false, file);
    assert.equal(html.includes("https://lymeplumbing.co.uk/404"), false, file);
  }
  const sitemap = readFileSync("public/sitemap.xml", "utf8");
  assert.equal(sitemap.includes("https://lymeplumbing.co.uk/404"), false);
  assert.equal(sitemap.includes("https://lymeplumbing.co.uk/thanks"), false);
  assert.equal(sitemap.match(/<loc>/g)?.length, 44);

  const server = await start();
  const { port } = server.address() as AddressInfo;
  try {
    const thanks = await get(port, "/thanks/");
    assert.equal(thanks.status, 200);
    assert.match(thanks.body, /<meta name="robots" content="noindex, follow">/);
    const missing = await get(port, "/this-page-does-not-exist-xyz/");
    assert.equal(missing.status, 404);
    assert.match(missing.body, /<meta name="robots" content="noindex, follow">/);
    assert.equal(/<link rel="canonical"/i.test(missing.body), false);
    for (const path of ["/404/", "/404"]) {
      const notFound = await get(port, path);
      assert.equal(notFound.status, 404, path);
      assert.match(notFound.body, /<meta name="robots" content="noindex, follow">/, path);
      assert.match(notFound.body, /That page isn't here/, path);
      assert.equal(/<link rel="canonical"/i.test(notFound.body), false, path);
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
});

function htmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = `${dir}/${name}`;
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return path.endsWith(".html") ? [path] : [];
  });
}

const blocksOf = (html: string) =>
  [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => match[1]);

test("the sitewide OfferCatalog includes leak detection, power flush and heat pump servicing", () => {
  const wanted = [
    ["Leak detection", "https://lymeplumbing.co.uk/services/leak-detection/"],
    ["Power flush", "https://lymeplumbing.co.uk/services/power-flush/"],
    ["Heat pump servicing and repair", "https://lymeplumbing.co.uk/services/heat-pump-servicing/"],
  ];
  let catalogs = 0;
  for (const page of htmlFiles("public")) {
    for (const block of blocksOf(readFileSync(page, "utf8"))) {
      const data = JSON.parse(block);
      if (!data.hasOfferCatalog) continue;
      catalogs++;
      assert.equal(data.hasOfferCatalog["@type"], "OfferCatalog", page);
      const items = data.hasOfferCatalog.itemListElement;
      for (const [name, url] of wanted) {
        const hits = items.filter((item: { itemOffered?: { url?: string } }) => item.itemOffered?.url === url);
        assert.equal(hits.length, 1, `${page} ${url}`);
        assert.equal(hits[0]["@type"], "Offer", page);
        assert.equal(hits[0].itemOffered["@type"], "Service", page);
        assert.equal(hits[0].itemOffered.name, name, page);
        assert.equal("price" in hits[0], false, page);
        assert.equal("price" in hits[0].itemOffered, false, page);
        assert.equal(hits[0].itemOffered.description, undefined, page);
      }
      assert.equal(JSON.stringify(data.hasOfferCatalog).includes('"price"'), false, page);
    }
  }
  assert.ok(catalogs >= 47, String(catalogs));
});
