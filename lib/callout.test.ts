import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";
import { business } from "./business.ts";
import { scrubPrices } from "./guard.ts";

function htmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = `${dir}/${name}`;
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return path.endsWith(".html") ? [path] : [];
  });
}

const pages = htmlFiles("public");

const banned =
  /[\u2013\u2014]|\b(MCS|F-gas|Benchmark|NICEIC|accredited|certified|approved installer)\b|\bG3\b|plus VAT|inc VAT|including VAT|excluding VAT|\bVAT\b|8am to 10pm|7am to 8am|Monday to Saturday|Timmins|GasXpress|Checkatrade|JustFix/i;

function slice(html: string, start: string, end: string): string {
  const from = html.indexOf(start);
  assert.equal(from >= 0, true, start);
  const to = html.indexOf(end, from);
  assert.equal(to > from, true, end);
  return html.slice(from, to);
}

test("published pages keep the call-out rates and leave the open points out", () => {
  const services = readFileSync("public/services/index.html", "utf8");
  const callout = slice(services, 'id="call-out"', "cta-band");
  assert.match(callout, /£60 for the first hour/);
  assert.match(callout, /no call-out fee/);
  assert.match(callout, /£90, including the first hour, then £60 an hour/);
  assert.match(callout, /£135, including the first hour, then £90 an hour/);
  assert.match(callout, /6pm to 10pm/);
  assert.match(callout, /10pm to 7am/);
  assert.match(callout, /Saturday after 1pm counts as the weekend/);
  assert.match(callout, /at this rate at any hour/);
  assert.match(callout, /Sunday is emergency call-outs only/);
  assert.match(callout, /Bank holidays are this rate too/);
  assert.match(callout, /paid before I set off/);
  assert.match(callout, /first hour is charged/);
  assert.match(callout, /Payment on completion\. Card payments accepted\./);
  assert.match(callout, /full hours/);
  assert.match(callout, /half-hour blocks/);
  assert.match(callout, /water you can't stop/);
  assert.match(callout, /I supply all the materials/);
  assert.match(callout, /I don't do gas or boiler work/);
  assert.match(callout, /What do you charge for a call-out\?/);
  assert.match(callout, /What counts as an emergency\?/);
  assert.match(callout, /How do you charge after the first hour\?/);
  assert.doesNotMatch(callout, banned);
  assert.equal(callout.includes("Gas Safe"), false);

  const home = readFileSync("public/index.html", "utf8");
  const rates = slice(home, 'id="rates"', 'id="featured"');
  assert.match(rates, /£60/);
  assert.match(rates, /£90/);
  assert.match(rates, /£135/);
  assert.match(rates, /6pm to 10pm/);
  assert.match(rates, /10pm to 7am/);
  assert.match(rates, /Saturday after 1pm/);
  assert.match(rates, /paid before I set off/);
  assert.match(rates, /href="services\/#call-out"/);
  assert.doesNotMatch(rates, banned);

  const emergency = readFileSync("public/services/emergency-plumber/index.html", "utf8");
  const cost = slice(emergency, "What it costs", "Questions");
  assert.match(cost, /£135/);
  assert.match(cost, /6pm to 10pm/);
  assert.match(cost, /10pm to 7am/);
  assert.match(cost, /Sunday is emergency call-outs only/);
  assert.match(cost, /paid before I set off/);
  assert.match(cost, /first hour is charged/);
  assert.doesNotMatch(cost, banned);
  assert.equal(cost.includes("Gas Safe"), false);

  for (const file of pages) {
    const html = readFileSync(file, "utf8");
    assert.doesNotMatch(html, /[\u2013\u2014]/, file);
    assert.doesNotMatch(html, /already bought|bought myself|buy your own/i, file);
    assert.doesNotMatch(html, banned, file);
  }
});

test("the basin, tap and radiator lines say Callum supplies the parts", () => {
  const home = readFileSync("public/index.html", "utf8");
  const basin = slice(home, 'data-answer="basin"', 'data-answer="toilet"');
  assert.match(basin, /Tell me the style you like and I(?:'|&#x27;)ll supply them/);
  assert.doesNotMatch(basin, /bought/);

  const plumbing = readFileSync("public/services/plumbing/index.html", "utf8");
  assert.match(plumbing, /Who supplies the tap or toilet\?/);
  assert.match(plumbing, /I supply the basin, tap or toilet/);
  assert.doesNotMatch(plumbing, /bought/);

  const radiators = readFileSync("public/services/radiators/index.html", "utf8");
  assert.match(radiators, /I'll supply the radiator|I&#x27;ll supply the radiator/);
  assert.doesNotMatch(radiators, /buy your own|bought/);
});

test("the chat may repeat only the published rates", () => {
  assert.deepEqual(business.allowedPrices, ["£135", "£90", "£60"]);
  assert.match(business.knowledge, /£60/);
  assert.match(business.knowledge, /£135/);
  assert.match(business.knowledge, /Sunday, emergency call-outs only/);
  assert.match(business.knowledge, /6pm to 10pm/);
  assert.match(business.knowledge, /10pm to 7am/);
  assert.match(business.knowledge, /Saturday after 1pm counts as the weekend/);
  assert.match(business.knowledge, /at that rate at any hour/);
  assert.match(business.knowledge, /paid before he sets off/);
  assert.match(business.knowledge, /first hour is charged/);
  assert.match(business.knowledge, /does not fit parts the customer has bought/);
  assert.match(business.knowledge, /does not fit a radiator the customer has bought/);
  assert.doesNotMatch(business.knowledge, /Sunday, closed/);
  assert.doesNotMatch(business.knowledge, /plus VAT|inc VAT|\bVAT\b|8am to 10pm|7am to 8am/);
  assert.match(business.fixed.payment, /paid before Callum sets off/);
  assert.match(business.fixed.payment, /Booked weekday visits: Payment on completion\. Card payments accepted\./);
  assert.doesNotMatch(business.fixed.price, /[\u2013\u2014]|VAT|8am to 10pm/);
  const kept = scrubPrices(
    "A booked visit is £60 for the first hour. Same-day is £90, including the first hour. An evening is £135. A bathroom is £2,400.",
    business.allowedPrices,
    business.priceStandIn,
  );
  assert.match(kept, /£60/);
  assert.match(kept, /£90/);
  assert.match(kept, /£135/);
  assert.match(kept, /a price Callum gives after he has seen the job/);
  assert.equal(kept.includes("£2,400"), false);
});
