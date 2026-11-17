import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const html = readFileSync("public/index.html", "utf8");
const css = readFileSync("public/assets/home.css", "utf8");
const heroSvg = html.slice(html.indexOf('<svg class="house house--hero"'), html.indexOf("</svg>", html.indexOf('<svg class="house house--hero"')));

test("the hero drawing has its depth planes, decorative ones hidden from screen readers", () => {
  assert.match(heroSvg, /<g class="h-far" aria-hidden="true">/);
  assert.match(heroSvg, /<path class="shell" /);
  assert.match(heroSvg, /<g class="h-near" aria-hidden="true">/);
  // order: far plane after the grid, shell first inside the house, near plane last
  assert.ok(heroSvg.indexOf('class="h-back"') < heroSvg.indexOf('class="h-far"'));
  assert.ok(heroSvg.indexOf('class="h-far"') < heroSvg.indexOf('class="h-mid"'));
  assert.ok(heroSvg.indexOf('class="h-front"') < heroSvg.indexOf('class="h-near"'));
  assert.match(heroSvg, /<g class="h-mid"><path class="shell" /);
});

test("only the hero carries the extra planes: the fault finder and the close drawing are untouched", () => {
  assert.equal(html.split('class="h-far"').length - 1, 1);
  assert.equal(html.split('class="h-near"').length - 1, 1);
  assert.equal(html.split('class="shell"').length - 1, 1);
});

test("reduced motion keeps the layers but stops them moving, and leaves the rates and photos still", () => {
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reduced, /#hero \.h-far, #hero \.near-l, #hero \.near-r \{ transform: none; translate: none; \}/);
  assert.match(reduced, /\.house--hero \.shell \{ animation: none; opacity: 1; \}/);
  assert.match(css, /html\.sc-animate \.rates li \{ position: sticky; \}/, "rates only stack when motion is on");
  assert.match(css, /html\.sc-animate \.recent:not\(\.in\) a/, "photos only start as a pile when motion is on");
});

test("rate cards stack on desktop only, so prices are never covered on a phone", () => {
  const desk = css.indexOf("@media (min-width: 861px) {\n  html.sc-animate .rates li { position: sticky; }");
  assert.ok(desk > -1);
});

test("the recent work grid is wired to the existing scroll-in observer", () => {
  assert.match(html, /<div class="recent drawin">/);
});
