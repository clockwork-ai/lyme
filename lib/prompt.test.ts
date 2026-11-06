import assert from "node:assert/strict";
import { test } from "node:test";
import { business } from "./business.ts";
import { buildInstructions, publicWidget } from "./prompt.ts";

test("the model is not handed a web address or a page path", () => {
  const text = buildInstructions(business, "/services/plumbing/");
  assert.equal(text.includes(".html"), false);
  assert.equal(text.includes("https://"), false);
  assert.equal(text.includes("http://"), false);
  assert.equal(text.includes("/contact"), false);
  assert.equal(text.includes("/services"), false);
  assert.match(text, /the plumbing page/);
  assert.match(text, /Never write a URL/);
  assert.match(text, /07846 729203/);
  assert.match(text, /WhatsApp/);
  assert.doesNotMatch(text, /wa\.me/);
  assert.doesNotMatch(text, /07359/);
  assert.doesNotMatch(text, /07985/);
  assert.doesNotMatch(text, /[\u2013\u2014]/);
});

test("the public widget config stays free of the prompt", () => {
  const widget = publicWidget(business);
  assert.equal(widget.title, "Ask Lyme");
  assert.equal(widget.suggestions.length, 3);
  assert.equal(widget.enabled, true);
  assert.equal("rules" in widget, false);
  assert.equal("knowledge" in widget, false);
  assert.equal("fixed" in widget, false);
  assert.equal(widget.phone, "07846 729203");
  assert.equal(widget.phoneHref, "tel:+447846729203");
  assert.equal(
    widget.whatsAppHref,
    "https://wa.me/447359838866?text=Hi%20Callum%2C%20I%20found%20you%20online.%20The%20job%20is%3A%20",
  );
});
