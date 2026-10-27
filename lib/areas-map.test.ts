import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { altText, areasFromHtml, buildMaps } from "./areas-map.mjs";

const html = readFileSync(new URL("../public/areas/index.html", import.meta.url), "utf8");
const wide = readFileSync(new URL("../public/assets/maps/areas-wide.svg", import.meta.url), "utf8");
const tall = readFileSync(new URL("../public/assets/maps/areas-tall.svg", import.meta.url), "utf8");

test("the areas map is generated from the areas list", () => {
  const areas = areasFromHtml(html);
  const built = buildMaps(html);
  assert.equal(wide, built.wide);
  assert.equal(tall, built.tall);
  const labels = (svg: string) => [...svg.matchAll(/data-area="([a-z0-9-]+)"[^>]*>([^<]+)</g)].map((match) => `${match[1]}:${match[2]}`).sort();
  assert.deepEqual(labels(wide), areas.map((area) => `${area.slug}:${area.name}`).sort());
  assert.deepEqual(labels(tall), areas.map((area) => `${area.slug}:${area.name}`).sort());
  const alt = html.match(/assets\/maps\/areas-wide\.svg" alt="([^"]+)"/);
  assert.ok(alt);
  assert.equal(alt[1], altText(areas));
  assert.match(html, /Not on the list\? Ring or text me with your postcode and I'll say if I can cover it\./);
  assert.doesNotMatch(html, /coming soon/);
});
