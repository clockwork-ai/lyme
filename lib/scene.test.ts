import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";

const html = readFileSync("public/index.html", "utf8");
const css = readFileSync("public/assets/home.css", "utf8");
const js = readFileSync("public/assets/home.js", "utf8");
const hero = html.slice(html.indexOf('<section id="hero"'), html.indexOf("</section>", html.indexOf('<section id="hero"')));

test("the hero is the drawing that comes to life: photo, matching drawing, plan and section line", () => {
  assert.match(hero, /<h1 id="hero-h" class="scene__title">/);
  assert.match(hero, /class="scene__layer scene__photo"><img src="assets\/scene\/house-photo-2400\.webp"[^>]+alt="A stone house in the High Peak at dusk/);
  assert.match(hero, /class="scene__layer scene__draw"><img src="assets\/scene\/house-drawing-2400\.webp"[^>]+alt=""/);
  assert.match(hero, /<svg class="scene__plan" viewBox="0 0 2720 1530"[^>]*aria-hidden="true">/);
  assert.doesNotMatch(hero, /Illustrative image/, "no tag on the picture (Callum, 17 Nov)");
  for (const f of ["house-photo-2400", "house-photo-1280", "house-drawing-2400", "house-drawing-1280"]) {
    const p = `public/assets/scene/${f}.webp`;
    assert.ok(existsSync(p) && statSync(p).size < 500_000, `${p} missing or too heavy`);
  }
});

test("every pipe run in the plan has a step in the scroll timeline, and the other way round", () => {
  const inPlan = [...new Set([...hero.matchAll(/<path class="run run--\w+" data-k="([\w-]+)"/g)].map((m) => m[1]))].sort();
  const inJs = [...js.matchAll(/\['([\w-]+)', 0\.\d+, 0\.\d+, '/g)].map((m) => m[1]).sort();
  assert.ok(inPlan.length >= 8);
  assert.deepEqual(inPlan, inJs);
});

test("the call, WhatsApp and quote buttons are still in the hero", () => {
  assert.match(hero, /href="tel:\+447846729203"/);
  assert.match(hero, /href="https:\/\/wa\.me\/447359838866/);
  assert.match(hero, /href="contact\/"/);
});

test("the homepage no longer singles out the boiler, and never offers boiler or gas work", () => {
  assert.doesNotMatch(html, /not the boiler\.<\/h1>|Boiler: not me|Not me<\/text>|data-fault="boiler"|data-answer="boiler"/);
  assert.doesNotMatch(hero, /boiler|gas/i);
  assert.doesNotMatch(html, /Gas Safe|gas engineer for hire|boiler (installation|service|repair)s?\b/i);
});

test("without motion the hero is the finished photo; the drawing only plays when home.js allows it", () => {
  assert.match(css, /\.scene__draw, \.scene__plan, \.scene__cut \{ display: none; \}/);
  assert.match(css, /html\.js-scene \.scene__draw, html\.js-scene \.scene__plan, html\.js-scene \.scene__cut \{ display: block; \}/);
  assert.match(js, /if \(hero && !reduce\) \{\n    document\.documentElement\.classList\.add\('js-scene'\);/);
});

test("the schematic shows the detail Callum asked for: smart controls, the bathroom, the cylinder heated by the heat pump", () => {
  for (const label of ["Smart thermostat", "Outdoor sensor", "FLOW 38°", "Bathroom", "Cylinder", "3-port valve", "Outside tap", "Stopcock", "Heat pump"]) {
    assert.match(hero, new RegExp(`>${label}<`), `missing ${label}`);
  }
  assert.doesNotMatch(hero, /Kitchen tap/);
  assert.match(hero, /class="sym sym--coil" data-k="primary"/, "the heating coil inside the cylinder");
  assert.match(js, /setProperty\('--cyl'/, "the cylinder fills with heat as the primary draws");
  assert.doesNotMatch(js, /setProperty\('--heat'/, "--heat is the copper colour, never a number");
});

test("Christmas: the dressed photo swaps in from 1 Dec to Twelfth Night, or with ?season=christmas", () => {
  for (const w of [1280, 2400]) {
    const p = `public/assets/scene/house-photo-xmas-${w}.webp`;
    assert.ok(existsSync(p) && statSync(p).size < 500_000, `${p} missing or too heavy`);
  }
  assert.match(js, /m === 11 \|\| \(m === 0 && day <= 6\)/);
  assert.match(js, /q === 'christmas'/);
});
