import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const page = readFileSync("public/areas/high-lane/index.html", "utf8");

function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<\/?(a|b|strong|em|i|span|abbr)\b[^>]*>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

test("the High Lane page title, description and questions match the visible copy", () => {
  const title = "Plumber in High Lane, Stockport | Lyme Plumbing & Heating";
  const description =
    "Local plumber based in High Lane, Stockport. Leaks, radiators, system flushes, unvented cylinders and heat pumps. Call or text Callum on 07846 729203.";
  assert.equal(page.match(/<title>([^<]*)<\/title>/)?.[1]?.replaceAll("&amp;", "&"), title);
  assert.equal(page.match(/<meta property="og:title" content="([^"]*)"/)?.[1]?.replaceAll("&amp;", "&"), title);
  assert.equal(page.match(/<meta name="description" content="([^"]*)"/)?.[1], description);
  assert.equal(page.match(/<meta property="og:description" content="([^"]*)"/)?.[1], description);
  assert.equal(page.includes("High Lane is where I'm based, so I'm never far away"), false);
  assert.equal(page.includes("High Lane is where I'm based, so this is home"), false);
  assert.equal(page.includes("High Lane is where I&#x27;m based, so this is home"), false);
  assert.equal(page.includes("High Lane is home, so I'm never far away."), true);
  assert.equal(
    page.includes("The everyday plumbing and heating jobs: plumbing, bathrooms, radiators, underfloor heating and heat pumps. You ring me, I come and look, I quote it and I do it."),
    true,
  );

  const blocks = [...page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => {
    const data = JSON.parse(match[1]);
    return data;
  });
  const faqs = blocks.filter((data) => data["@type"] === "FAQPage");
  assert.equal(faqs.length, 1);
  const text = visibleText(page);
  const questions = faqs[0].mainEntity;
  assert.equal(questions.length, 4);
  for (const question of questions) {
    assert.equal(question["@type"], "Question");
    assert.equal(question.acceptedAnswer["@type"], "Answer");
    assert.equal(text.includes(question.name), true, question.name);
    assert.equal(text.includes(question.acceptedAnswer.text), true, question.acceptedAnswer.text);
  }
  assert.deepEqual(
    questions.map((question: { name: string; acceptedAnswer: { text: string } }) => [question.name, question.acceptedAnswer.text]),
    [
      [
        "Where are you based?",
        "I'm based in High Lane, Stockport SK6, on the A6 between Hazel Grove and Disley. Travel is included in the quote.",
      ],
      [
        "What jobs do you do in High Lane?",
        "Plumbing jobs and leaks, radiators, system flushes with a Thoroughflush unit, unvented cylinders and air source heat pumps. I'm a City & Guilds qualified plumber and BPEC Level 3 heat pump qualified.",
      ],
      [
        "Do you cover the towns nearby?",
        "Yes. From High Lane I cover Disley, Marple, Hazel Grove and Poynton, as well as Stockport, New Mills and Whaley Bridge.",
      ],
      [
        "How do I get a quote, and what are your hours?",
        "Ring or text 07846 729203 with your postcode, or use the Get a quote form. I work Monday to Friday 7am to 6pm and Saturday 7am to 1pm. Sunday is emergencies only, 8am to 10pm.",
      ],
    ],
  );
  assert.match(page, /href="\.\.\/\.\.\/services\/system-flush\/">system flushes<\/a>/);
  assert.match(page, /href="\.\.\/\.\.\/contact\/">Get a quote form<\/a>/);
  assert.equal(page.includes("+447846729203"), true);
  assert.doesNotMatch(page, /power[\s-]?flush|chemical flush|\bG3\b/i);
  assert.doesNotMatch(page, /[\u2013\u2014]/);
});
