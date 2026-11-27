import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";

function htmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = `${dir}/${name}`;
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return path.endsWith(".html") ? [path] : [];
  });
}

function blocks(html: string): unknown[] {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) =>
    JSON.parse(match[1]),
  );
}

function faqPages(html: string): { mainEntity: { name: string; acceptedAnswer: { text: string } }[] }[] {
  return blocks(html).filter((data) => (data as { "@type"?: string })["@type"] === "FAQPage") as {
    mainEntity: { name: string; acceptedAnswer: { text: string } }[];
  }[];
}

function visibleAnswer(html: string, question: string): string {
  const escaped = question.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`<summary>${escaped}</summary><p>([\\s\\S]*?)</p>`));
  assert.ok(match, question);
  return match[1]
    .replace(/<a\b[^>]*>/g, "")
    .replace(/<\/a>/g, "")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "");
}

const added: Record<string, [string, string][]> = {
  "public/about/index.html": [
    [
      "Who answers the phone, and who turns up?",
      "Me. I'm Callum, a sole trader based in High Lane. I answer the phone, I come round, I quote it and I fix it. The bloke who quotes it is the bloke who fixes it.",
    ],
    [
      "What if you're running late for a booked visit?",
      "I'll tell you honestly when I can get there. If I'm on a job, text 07846 729203 and I'll come back to you.",
    ],
    [
      "Will you explain the job before you leave?",
      "Yes. I tell you what's wrong and what I'd do before I start, and the price. When it's done I show you where the isolation valve is. On heating controls I set it up with you before I leave, and after radiator work I check the system pressure and show you how to top it up if you ever need to.",
    ],
  ],
  "public/contact/index.html": [
    [
      "When will I hear back with a quote?",
      "I'll come back to you. Ring, text or send the form, and a photo helps me quote. If I'm on a job when you ring, text 07846 729203 and I'll come back to you. For a leak, ring rather than send the form.",
    ],
    [
      "Will I get a price before you start?",
      "Yes. You get a price for the job before I pick a tool up. I look at the job, tell you what's wrong and what I'd do, then give you the price. A visit uses the published call-out rates on my services page. Those are for the visit, not a price for a big repair. Larger jobs are a free quote. I supply the materials. Materials are extra.",
    ],
  ],
  "public/services/emergency-plumber/index.html": [
    [
      "Can you come today, this evening, or on a Sunday?",
      "Where I can. Ring me and I'll tell you honestly when I can get there. If I can't get to you quickly, I'll say so, so you can call someone else. My hours are Monday to Friday, 7am to 6pm, and Saturday, 7am to 1pm. Evenings are 6pm to 10pm. Sunday is emergencies only, 8am to 10pm. Overnight emergencies are 10pm to 7am. For a leak, ring 07846 729203.",
    ],
  ],
  "public/services/leak-detection/index.html": [
    [
      "Do you only patch a leak, or do you find the source?",
      "I find the source first, then I stop it, then I do the proper fix. I don't take floors or walls up until I know where it is, or I've told you why that's the next step and what it would cost. You get a price before I do the repair.",
    ],
  ],
  "public/services/bathrooms/index.html": [
    [
      "Will you leave the house tidy?",
      "Yes. When it's done I test it, clean up, and show you where the isolation valve is.",
    ],
  ],
  "public/services/radiators/index.html": [
    [
      "My radiator valve is leaking. Can you fix it?",
      "Yes. Radiator and valve leaks are one of the jobs I get called for, including thermostatic and lockshield valves. You get a price before I start. Ring 07846 729203. If it's water you can't stop, that's an emergency. If you can hear water but can't see where it's coming from, that's leak detection. For a radiator that's cold at the top or the bottom, see my radiator guide.",
    ],
  ],
  "public/services/smart-controls/index.html": [
    [
      "My smart radiator control has stopped working. Can you help?",
      "Yes. I can check the control, the valve and the programmer, and tell you what I find. You get a price before I start. If the heating won't come on at all, see heating controls.",
    ],
  ],
};

test("each new FAQ is visible once and lives in exactly one FAQPage block", () => {
  for (const [file, questions] of Object.entries(added)) {
    const html = readFileSync(file, "utf8");
    const faqs = faqPages(html);
    assert.equal(faqs.length, 1, file);
    const names = faqs[0].mainEntity.map((item) => item.name);
    if (file.endsWith("/about/index.html") || file.endsWith("/contact/index.html")) {
      assert.deepEqual(names, questions.map(([name]) => name), file);
    }
    for (const [name, answer] of questions) {
      assert.equal(names.filter((item) => item === name).length, 1, `${file} ${name}`);
      assert.equal(html.split(`<summary>${name}</summary>`).length - 1, 1, file);
      const schema = faqs[0].mainEntity.find((item) => item.name === name);
      assert.equal(schema?.acceptedAnswer.text, answer, file);
      assert.equal(visibleAnswer(html, name), answer, file);
    }
    assert.equal(/<\/a> \./.test(html), false, file);
  }

  const contact = readFileSync("public/contact/index.html", "utf8");
  assert.equal(contact.includes("There's more in"), false);
  assert.equal(contact.includes("what a visit costs"), false);
  assert.match(contact, /<a href="https:\/\/lymeplumbing\.co\.uk\/services\/">services page<\/a>\./);

  const radiators = readFileSync("public/services/radiators/index.html", "utf8");
  assert.match(radiators, /<a href="\.\.\/\.\.\/services\/emergency-plumber\/">emergency<\/a>\./);
  assert.match(radiators, /<a href="\.\.\/\.\.\/services\/leak-detection\/">leak detection<\/a>\./);
  assert.match(radiators, /<a href="\.\.\/\.\.\/guides\/radiators-cold-top-or-bottom\/">radiator guide<\/a>\./);
  assert.match(radiators, /<summary>Can you move a radiator to a different wall\?<\/summary>/);

  const smart = readFileSync("public/services/smart-controls/index.html", "utf8");
  assert.match(smart, /<a href="\.\.\/\.\.\/services\/heating-controls\/">heating controls<\/a>\./);
  assert.match(smart, /<summary>Will you wire it inside the boiler\?<\/summary>/);

  const bathrooms = readFileSync("public/services/bathrooms/index.html", "utf8");
  assert.equal(bathrooms.includes("What if something is not right after you leave?"), false);
  assert.match(bathrooms, /<summary>Do you tile the bathroom\?<\/summary>/);

  const emergency = readFileSync("public/services/emergency-plumber/index.html", "utf8");
  assert.match(emergency, /<summary>What do you charge for an emergency\?<\/summary>/);
  assert.match(emergency, /Overnight is 10pm to 7am\. Saturday after 1pm counts as the weekend\./);
});

const guides = [
  {
    file: "public/guides/leak-or-flood-on-a-sunday/index.html",
    url: "https://lymeplumbing.co.uk/guides/leak-or-flood-on-a-sunday/",
    title: "Sunday leak or flood: what to do first | Lyme",
    description:
      "Turn the stopcock off, then ring or text Callum on 07846 729203. Sunday emergencies are 8am to 10pm, and overnight is 10pm to 7am. Same-day help where I can, from High Lane, Stockport.",
    heading: "A leak or a flood on a Sunday: what to do before I arrive",
  },
  {
    file: "public/guides/what-a-visit-costs/index.html",
    url: "https://lymeplumbing.co.uk/guides/what-a-visit-costs/",
    title: "What a visit costs, and the price before I start | Lyme",
    description:
      "Published call-out rates for booked, same-day, evening and Sunday visits, and why you get a price before I start. From Callum in High Lane, Stockport.",
    heading: "What a visit costs, and why you get a price before I start",
  },
];

test("both new guides have the given title and description, and no FAQ block", () => {
  for (const guide of guides) {
    const html = readFileSync(guide.file, "utf8");
    assert.equal(html.match(/<title>([^<]*)<\/title>/)?.[1], guide.title);
    assert.equal(html.match(/<meta name="description" content="([^"]*)"/)?.[1], guide.description);
    assert.equal(html.match(/<meta property="og:title" content="([^"]*)"/)?.[1], guide.title);
    assert.equal(html.match(/<meta property="og:description" content="([^"]*)"/)?.[1], guide.description);
    assert.match(html, new RegExp(`<link rel="canonical" href="${guide.url}">`));
    assert.match(html, new RegExp(`<h1 class="h1">${guide.heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</h1>`));
    assert.equal(faqPages(html).length, 0, guide.file);
    assert.equal(html.includes('class="faq"'), false, guide.file);
    assert.match(html, /<a href="\.\.\/\.\.\/guides\/">Guides<\/a>/);
    assert.match(html, /Get the monthly guide/);
    assert.match(html, /Talk to Callum/);
    assert.match(html, /<!-- measure:start -->[\s\S]*<!-- measure:end -->/);
    assert.doesNotMatch(html, /[\u2013\u2014]/);
  }

  const sunday = readFileSync(guides[0].file, "utf8");
  assert.match(sunday, /<h2 class="h3">Sundays, evenings, overnight and same-day: when I can come<\/h2>/);
  assert.match(
    sunday,
    /Monday to Friday I work 7am to 6pm, and Saturday 7am to 1pm\. Evenings are 6pm to 10pm\. Sunday is emergencies only, 8am to 10pm\. Overnight emergencies are 10pm to 7am\./,
  );
  assert.match(sunday, /<a href="\.\.\/\.\.\/services\/leak-detection\/">leak detection<\/a>\./);
  assert.match(sunday, /<a href="\.\.\/\.\.\/services\/emergency-plumber\/">emergency plumbing<\/a>/);
  assert.match(sunday, /<a href="\.\.\/\.\.\/areas\/high-lane\/">High Lane<\/a>/);
  assert.match(sunday, /<a href="\.\.\/\.\.\/contact\/">quote form<\/a>/);
  assert.match(sunday, /<a href="\.\.\/\.\.\/guides\/">guides<\/a>\./);
  assert.match(sunday, /name="page" value="\/guides\/leak-or-flood-on-a-sunday\/"/);

  const costs = readFileSync(guides[1].file, "utf8");
  assert.match(costs, /£60 for the first hour\. That's a 1 hour minimum, and there's no call-out fee\. Larger jobs are a free quote\. Payment on completion\. Card payments accepted\./);
  assert.match(costs, /£90, including the first hour, then £60 an hour\. The first hour is paid before I set off, and the rest when the job's done\./);
  assert.match(
    costs,
    /£135, including the first hour, then £90 an hour\. Evenings are 6pm to 10pm\. Overnight is 10pm to 7am\. Saturday after 1pm counts as the weekend\. Sunday emergencies are 8am to 10pm only, at this rate\. Bank holidays are this rate too\. The first hour is paid before I set off, and the rest when the job's done\./,
  );
  assert.match(costs, /<a href="\.\.\/\.\.\/contact\/">quote form<\/a>\./);
  assert.match(costs, /<a href="\.\.\/\.\.\/services\/">services page<\/a>\./);
  assert.match(costs, /<a href="\.\.\/\.\.\/services\/plumbing\/">plumbing jobs<\/a>/);
  assert.match(costs, /<a href="\.\.\/\.\.\/services\/emergency-plumber\/">emergency plumbing<\/a>/);
  assert.match(costs, /<a href="\.\.\/\.\.\/guides\/">guides<\/a>\./);
  assert.match(costs, /name="page" value="\/guides\/what-a-visit-costs\/"/);
});

test("the sitemap and guides index list both new guides after the radiator guide", () => {
  const sitemap = readFileSync("public/sitemap.xml", "utf8");
  assert.equal(sitemap.match(/<loc>/g)?.length, 49);
  const sunday = sitemap.indexOf("https://lymeplumbing.co.uk/guides/leak-or-flood-on-a-sunday/");
  const costs = sitemap.indexOf("https://lymeplumbing.co.uk/guides/what-a-visit-costs/");
  const radiator = sitemap.indexOf("https://lymeplumbing.co.uk/guides/radiators-cold-top-or-bottom/");
  assert.ok(radiator >= 0 && sunday > radiator && costs > sunday);

  const index = readFileSync("public/guides/index.html", "utf8");
  const cards = [...index.matchAll(/href="\.\.\/guides\/([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(cards, [
    "radiators-cold-top-or-bottom/",
    "leak-or-flood-on-a-sunday/",
    "what-a-visit-costs/",
  ]);
  assert.match(index, /<b>A leak or a flood on a Sunday: what to do before I arrive<\/b><span>Turn the water off, ring me, and what counts as an emergency\.<\/span>/);
  assert.match(index, /<b>What a visit costs, and why you get a price before I start<\/b><span>The published call-out rates, payment, and quotes for bigger jobs\.<\/span>/);
});

test("no page or schema contains a build note, a gap line or a Callum approval note", () => {
  const banned = ["(Build", "[GAP", "NEEDS CALLUM"];
  for (const file of htmlFiles("public")) {
    const html = readFileSync(file, "utf8");
    for (const note of banned) assert.equal(html.includes(note), false, `${file} ${note}`);
    for (const block of blocks(html)) {
      const text = JSON.stringify(block);
      for (const note of banned) assert.equal(text.includes(note), false, `${file} schema ${note}`);
    }
  }
});
