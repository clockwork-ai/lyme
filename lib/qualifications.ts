/**
 * Verified qualifications published on the site.
 *
 * Add another object to this array when a new one has been checked.
 * Then add a matching <li> in the About page list. The home page trust
 * line reads `short` and `label`.
 *
 * Do not add dates, certificate numbers, or anything that is not verified.
 * Do not add MCS, F-gas, Gas Safe, G3, Benchmark, NICEIC or insurance.
 * Do not name a qualification for unvented cylinders. That service stays,
 * with no qualification claim.
 * The only qualification wordings are "City & Guilds qualified plumber"
 * and "BPEC Level 3 heat pump qualified".
 */

export type Qualification = {
  /** Wording to publish. Edit this when the verified name changes. */
  title: string;
  /** Optional line under the title. */
  label?: string;
  /** Optional plain-language line about what it covers. */
  summary?: string;
  /** Shorter home-page line. Omit to use `title`. */
  short?: string;
};

export const qualifications: readonly Qualification[] = [
  {
    title: "City & Guilds qualified plumber",
  },
  {
    title: "BPEC Level 3 heat pump qualified",
  },
];

/** Home page trust strip. Edit this string when the wording changes. */
export const homeTrustStrip =
  "City & Guilds qualified plumber · BPEC Level 3 heat pump qualified · Local to High Lane";

/** Heat pump page. Edit this string when the wording changes. */
export const heatPumpLine =
  "I install air source heat pumps, and I service, repair and maintain them, whoever fitted them. That covers the plumbing side: cylinders, pipework, radiators, flow rates, system water, filters and controls. I'm BPEC Level 3 heat pump qualified.";

/** Home-page trust line for one qualification. Kept so a later item can still carry its own short line. */
export function homeTrust(item: Qualification): string {
  const line = item.short ?? item.title;
  return item.label ? `${line}, ${item.label}` : line;
}

function detail(item: Qualification): string {
  const parts = [item.title, item.label, item.summary].filter((part): part is string => Boolean(part));
  const text = parts.join(". ");
  return text.endsWith(".") ? text : `${text}.`;
}

export function qualificationKnowledge(items: readonly Qualification[] = qualifications): string {
  const body = items.map(detail).join(" ");
  const only = items.length === 1
    ? "That is the only qualification on the site."
    : "Those are the only qualifications on the site.";
  return `${body} ${only} Do not add an NVQ, a level, a date or a certificate number unless those words are already in the wording above. Do not name any other qualification. Do not claim a qualification for unvented cylinders. Do not say he is insured, MCS, F-gas, Gas Safe, Benchmark or NICEIC registered. If they ask about those, say the site does not list them.`;
}

export function qualificationReply(items: readonly Qualification[] = qualifications): string {
  if (items.length === 0) {
    return "The site does not list a qualification. Ring Callum on 07846 729203, or use Get a quote.";
  }
  const lead = "Callum is a City & Guilds qualified plumber, and he is BPEC Level 3 heat pump qualified.";
  const only = items.length === 1
    ? "That is the only qualification listed on the site."
    : "Those are the only qualifications listed on the site.";
  const extra = items
    .map(detail)
    .filter((line) => !lead.includes(line.replace(/\.$/, "")))
    .join(" ");
  return extra ? `${lead} ${extra} ${only}` : `${lead} ${only}`;
}
