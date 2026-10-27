import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { keyboardFrame } from "./viewport.ts";

test("leaves the panel to CSS when the keyboard is closed", () => {
  assert.equal(keyboardFrame(844, 844, 0), null);
  assert.equal(keyboardFrame(844, 780, 0), null);
});

test("fits the panel inside the visible viewport when the keyboard is open", () => {
  const frame = keyboardFrame(844, 380, 0);
  assert.ok(frame);
  assert.equal(frame.top, 8);
  assert.equal(frame.height, 364);
  assert.ok(frame.top + frame.height <= 380);
});

test("follows a shifted visual viewport", () => {
  const frame = keyboardFrame(844, 340, 52);
  assert.ok(frame);
  assert.equal(frame.top, 60);
  assert.equal(frame.height, 324);
  assert.ok(frame.top + frame.height <= 52 + 340);
});

test("the widget uses the same keyboard frame", () => {
  const widget = readFileSync(new URL("../public/chat/widget.js", import.meta.url), "utf8");
  assert.match(widget, /innerHeight - vvHeight - vvOffsetTop <= 80/);
  assert.match(widget, /Math\.max\(0, vvOffsetTop\) \+ 8/);
  assert.match(widget, /Math\.min\(height, Math\.round\(vvHeight - 8\)\)/);
});
