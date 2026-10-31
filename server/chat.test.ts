import assert from "node:assert/strict";
import { test } from "node:test";
import { resetRateLimits } from "../lib/guard.ts";
import { handleChat, type ChatEnv } from "./chat.ts";

function env(run?: ChatEnv["AI"] extends infer T ? T extends { run: infer R } ? R : never : never): ChatEnv {
  return {
    AI: {
      run: (run as ChatEnv["AI"] extends { run: infer R } ? R : never) || (async () => ({ response: "Callum covers High Lane." })),
    },
  };
}

function post(body: unknown, origin = "http://127.0.0.1:8787"): Request {
  return new Request("http://127.0.0.1:8787/api/chat", {
    method: "POST",
    headers: {
      origin,
      "content-type": "application/json",
      "cf-connecting-ip": "203.0.113.10",
    },
    body: JSON.stringify(body),
  });
}

test("the button stays hidden when Workers AI is not bound", async () => {
  const response = await handleChat(new Request("http://127.0.0.1:8787/api/chat"), {});
  const body = await response.json();
  assert.equal(body.enabled, false);
});

test("the widget config does not include the prompt", async () => {
  const response = await handleChat(new Request("http://127.0.0.1:8787/api/chat"), env());
  const body = await response.json();
  assert.equal(body.title, "Ask Lyme");
  assert.equal(body.suggestions.length, 3);
  assert.equal(body.jobs.includes("Plumbing jobs"), true);
  assert.equal("knowledge" in body, false);
});

test("a leak is answered without the model", async () => {
  resetRateLimits();
  let called = false;
  const response = await handleChat(post({ messages: [{ role: "user", content: "I've got a leak" }], page: "/" }), {
    AI: { async run() { called = true; return { response: "no" }; } },
  });
  const text = await response.text();
  assert.equal(called, false);
  assert.match(text, /stop tap/i);
  assert.match(text, /07846 729203/);
  assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8");
});

test("a boiler question is a polite no", async () => {
  resetRateLimits();
  const response = await handleChat(post({ messages: [{ role: "user", content: "Do you do boilers?" }] }), env());
  const text = await response.text();
  assert.match(text, /gas engineer/);
  assert.doesNotMatch(text, /Gas Safe/);
  assert.equal(text.includes("£"), false);
});

test("a quote request points at the form", async () => {
  resetRateLimits();
  const response = await handleChat(post({ messages: [{ role: "user", content: "Can I get a quote?" }] }), env());
  const text = await response.text();
  assert.match(text, /your name/);
  assert.match(text, /Get a quote|the form/i);
});

test("a model reply loses a price, a dash and a path", async () => {
  resetRateLimits();
  const encoder = new TextEncoder();
  const sse = [
    'data: {"response":"Monday"}',
    'data: {"response":"\\u2013Friday. A tap is £80. See /contact/ please."}',
    "",
  ].join("\n");
  const response = await handleChat(post({ messages: [{ role: "user", content: "Do you cover High Lane?" }] }), {
    AI: {
      async run() {
        return new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(sse));
            controller.close();
          },
        });
      },
    },
  });
  const text = await response.text();
  assert.equal(text.includes("£"), false);
  assert.equal(text.includes("80"), false);
  assert.equal(text.includes("/contact"), false);
  assert.doesNotMatch(text, /[\u2013\u2014]/);
  assert.match(text, /quote form/);
  assert.match(text, /High Lane|Monday/);
});

test("another site cannot post to the chat", async () => {
  resetRateLimits();
  const response = await handleChat(post({ messages: [{ role: "user", content: "Hello" }] }, "https://example.com"), env());
  assert.equal(response.status, 403);
});
