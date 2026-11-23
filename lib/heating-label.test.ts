import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";
import { JOBS, parseSubmission } from "../functions/_lib/quote-mail.js";

const OLD_LABEL = "Heating faults (not the boiler)";
const OLD_FAQ = ", not the boiler.";
const FAQ = "Often it's the thermostat, the programmer or a valve. I can check those first.";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = `${dir}/${name}`;
    if (statSync(path).isDirectory()) return name === "node_modules" ? [] : files(path);
    if (name.endsWith(".test.ts")) return [];
    return /\.(html|txt|js|mjs|ts|css|xml|json|md)$/.test(name) ? [path] : [];
  });
}

function htmlFiles(dir: string): string[] {
  return files(dir).filter((path) => path.endsWith(".html"));
}

function regions(html: string): { name: string; text: string }[] {
  const found: { name: string; text: string }[] = [];
  const take = (name: string, re: RegExp) => {
    for (const match of html.matchAll(re)) found.push({ name, text: match[0] });
  };
  take("nav", /<nav class="menu__svcs"[\s\S]*?<\/nav>/g);
  take("footer", /<h2>Services<\/h2><ul>[\s\S]*?<\/ul>/g);
  take("service list", /<(?:ul class="svc-list"|ol class="key")[\s\S]*?<\/(?:ul|ol)>/g);
  take("other jobs", /<div class="side__more">[\s\S]*?<\/div>/g);
  take("job select", /<select id="f-job"[\s\S]*?<\/select>/g);
  take("breadcrumb", /<nav class="crumbs"[\s\S]*?<\/nav>/g);
  const names: string[] = [];
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    collectServiceNames(JSON.parse(match[1]), names);
  }
  if (names.length) found.push({ name: "schema", text: names.join("\n") });
  return found;
}

function collectServiceNames(node: unknown, names: string[]): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectServiceNames(item, names);
    return;
  }
  const record = node as { name?: unknown; serviceType?: unknown };
  for (const key of ["name", "serviceType"] as const) {
    const value = record[key];
    if (typeof value === "string" && (value.includes("Heating faults") || value.includes(OLD_FAQ) || value.includes(OLD_LABEL))) {
      names.push(value);
    }
  }
  for (const value of Object.values(record)) collectServiceNames(value, names);
}

function heatingFaultLinks(html: string): string[] {
  return [...html.matchAll(/heating-faults\/">([^<]+)/g)].map((match) => match[1].trim());
}

test("the heating faults service label does not say not the boiler", () => {
  assert.equal(JOBS.includes(OLD_LABEL), false);
  assert.equal(JOBS.join("\n").includes(OLD_FAQ), false);
  assert.equal(JOBS.includes("Heating faults"), true);

  const llms = readFileSync("public/llms.txt", "utf8");
  const services = llms.slice(llms.indexOf("## Services"), llms.indexOf("## Areas covered"));
  assert.equal(services.includes(OLD_LABEL), false);
  assert.equal(services.includes(OLD_FAQ), false);
  assert.match(services, /- \[Heating faults\]\(https:\/\/lymeplumbing\.co\.uk\/services\/heating-faults\/\)/);

  const sources = ["public", "functions", "lib", "server"].flatMap((dir) => files(dir));
  const labelled = sources.filter((path) => readFileSync(path, "utf8").includes(OLD_LABEL));
  assert.deepEqual(labelled, []);

  for (const page of htmlFiles("public")) {
    const html = readFileSync(page, "utf8");
    const parts = regions(html);
    if (html.includes('class="menu__svcs"')) {
      assert.equal(parts.some((part) => part.name === "nav"), true, page);
      assert.equal(parts.some((part) => part.name === "footer"), true, page);
    }
    for (const part of parts) {
      assert.equal(part.text.includes(OLD_LABEL), false, `${page} ${part.name}`);
      assert.equal(part.text.includes(OLD_FAQ), false, `${page} ${part.name}`);
      if (part.name === "schema") {
        for (const name of part.text.split("\n")) assert.equal(name, "Heating faults", `${page} schema ${name}`);
        continue;
      }
      for (const label of heatingFaultLinks(part.text)) {
        assert.equal(label, "Heating faults", `${page} ${part.name} link`);
      }
      for (const bold of part.text.matchAll(/<b>([^<]*)<\/b>/g)) {
        if (bold[1].includes("Heating faults") || bold[1].includes("boiler")) {
          assert.equal(bold[1], "Heating faults", `${page} ${part.name}`);
        }
      }
    }
  }

  const contact = readFileSync("public/contact/index.html", "utf8");
  const select = contact.match(/<select id="f-job"[\s\S]*?<\/select>/)![0];
  const options = [...select.matchAll(/<option>([^<]*)<\/option>/g)].map((match) => match[1]);
  assert.deepEqual(options, JOBS);

  const home = readFileSync("public/index.html", "utf8");
  const start = home.indexOf('data-answer="stat"');
  const next = home.indexOf('<div class="answer"', start);
  const faq = home.slice(start, next);
  const paragraph = faq.match(/<p>(?!That's me\.)([\s\S]*?)<\/p>/)![1].replaceAll("&#x27;", "'");
  assert.equal(paragraph, FAQ);
  assert.equal(faq.includes(OLD_FAQ), false);
  assert.equal(faq.includes(OLD_LABEL), false);
  for (const block of home.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    const data = JSON.parse(block[1]);
    if (data["@type"] !== "FAQPage") continue;
    for (const question of data.mainEntity) {
      const answer = String(question.acceptedAnswer?.text ?? "");
      if (answer.includes("thermostat, the programmer or a valve")) assert.equal(answer, FAQ);
      assert.equal(answer.includes(OLD_FAQ), false);
    }
  }
});

test("the quote form accepts the renamed heating faults job", async () => {
  const form = () => {
    const fields = new FormData();
    for (const [key, value] of Object.entries({
      name: "Ada Stone",
      phone: "07700 900123",
      postcode: "SK6 8AA",
      message: "Radiators stay cold.",
      best_time: "Morning",
      consent: "yes",
      hp: "",
    })) fields.set(key, value);
    return fields;
  };
  const kept = form();
  kept.set("job", "Heating faults");
  const ok = await parseSubmission(kept);
  assert.equal(ok.ok && ok.fields.job, "Heating faults");
  const dropped = form();
  dropped.set("job", OLD_LABEL);
  assert.equal((await parseSubmission(dropped)).ok, false);
});

test("the heating faults heading stays away from the boiler", () => {
  const page = readFileSync("public/services/heating-faults/index.html", "utf8");
  assert.match(page, /<h1 class="h1">Heating faults away from the boiler<\/h1>/);
  const services = readFileSync("public/services/index.html", "utf8");
  assert.match(services, /Heating faults away from the boiler\./);
});
