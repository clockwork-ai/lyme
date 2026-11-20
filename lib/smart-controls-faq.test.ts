import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";

const pagePath = "public/services/smart-controls/index.html";
const answer =
  "Yes, if the controls need it. I can make the low-voltage control and power connections at the boiler, like any controls engineer. I don't touch any gas parts or the boiler's gas settings.";
const oldAnswer = "No. I don't do any work inside the boiler";

function textFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (name === "node_modules" || name === ".git" || name === "preview-shots") return [];
    const path = `${dir}/${name}`;
    if (statSync(path).isDirectory()) return textFiles(path);
    if (/\.(png|webp|jpg|jpeg|gif|ico|woff2?)$/i.test(name)) return [];
    return [path];
  });
}

test("the smart controls FAQ allows low-voltage connections at the boiler", () => {
  const html = readFileSync(pagePath, "utf8");
  const visible = html.match(/<summary>Will you wire it inside the boiler\?<\/summary><p>([^<]*)<\/p>/);
  assert.equal(visible?.[1], answer);
  const faq = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((match) => JSON.parse(match[1]))
    .find((block) => block["@type"] === "FAQPage");
  const question = faq.mainEntity.find(
    (item: { name: string }) => item.name === "Will you wire it inside the boiler?",
  );
  assert.equal(question.acceptedAnswer.text, answer);
  assert.equal(html.includes(oldAnswer), false);
});

test("the old refusal to work inside the boiler is gone", () => {
  const hits = ["public", "lib", "server", "src", "scripts", "functions"]
    .flatMap((dir) => textFiles(dir))
    .filter((file) => !file.endsWith(".test.ts") && readFileSync(file, "utf8").includes(oldAnswer));
  assert.deepEqual(hits, []);
});
