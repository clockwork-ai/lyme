import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";
import { business } from "./business.ts";

const line = "Payment on completion. Card payments accepted.";
const icon = '<svg aria-hidden="true" viewBox="0 0 24 24">';

function files(path: string): string[] {
  return readdirSync(path).flatMap((name) => {
    const child = `${path}/${name}`;
    if (statSync(child).isDirectory()) return files(child);
    return child.endsWith(".html") ? [child] : [];
  });
}

function slice(html: string, start: string, end: string): string {
  const from = html.indexOf(start);
  assert.equal(from >= 0, true, start);
  const to = html.indexOf(end, from);
  assert.equal(to > from, true);
  return html.slice(from, to);
}

test("every page says payment is on completion and cards are accepted", () => {
  const pages = files("public");
  assert.equal(pages.length > 30, true);
  for (const file of pages) {
    const html = readFileSync(file, "utf8");
    const footer = slice(html, "<footer", "</footer>");
    assert.equal(footer.includes(line), true, file);
    assert.equal(footer.includes(icon), true, file);
    assert.equal(/sumup/i.test(html), false, file);
    assert.equal(html.includes("bank transfer"), false, file);
    assert.equal(html.includes("Pay by card, cash"), false, file);
    assert.equal(html.includes("accepted on the day"), false, file);
    assert.equal(html.includes("Payment is on the day"), false, file);
    assert.doesNotMatch(footer, /[\u2013\u2014]/);
  }
});

test("the note sits with the quote buttons and the payment line", () => {
  const contact = readFileSync("public/contact/index.html", "utf8");
  const head = slice(contact, 'class="phead', "</section>");
  assert.equal(head.includes(line), true);
  const form = contact.slice(contact.indexOf('id="quote"'), contact.indexOf("</form>"));
  assert.equal(form.includes(line), true);
  assert.equal(form.includes("on the day"), false);

  const home = readFileSync("public/index.html", "utf8");
  assert.equal(slice(home, 'id="close"', "</section>").includes(line), true);

  const about = readFileSync("public/about/index.html", "utf8");
  assert.equal(slice(about, "cta-band", "</section>").includes(line), true);

  assert.match(business.knowledge, /Payment on completion\. Card payments accepted\./);
  assert.doesNotMatch(business.knowledge, /sumup|cash|bank transfer/i);
  assert.doesNotMatch(business.fixed.payment, /sumup|cash|bank transfer/i);
});
