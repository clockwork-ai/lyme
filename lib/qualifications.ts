/**
 * Verified qualifications published on the site.
 *
 * Add another object to this array when a new one has been checked.
 * Then add a matching <li> in the About page list. The home page trust
 * line reads `short` and `label`.
 *
 * Do not add dates, certificate numbers, or anything that is not verified.
 * Do not add MCS, F-gas, Gas Safe, G3, Benchmark, NICEIC or insurance.
 */

export type Qualification = {
  /** Full name, as verified. */
  title: string;
  /** Short line under the title, such as "Ofqual regulated". */
  label: string;
  /** What it covers, in plain language. */
  summary: string;
  /** Shorter home-page line. The full title stays on the About page. */
  short: string;
};

export const qualifications: readonly Qualification[] = [
  {
    title:
      "BPEC Level 3 Award in the Installation and Maintenance of Heat Pump Systems (Non-refrigerant Circuits)",
    label: "Ofqual regulated",
    summary:
      "It covers installing, commissioning, servicing and maintaining heat pump systems (non-refrigerant circuits).",
    short: "BPEC Level 3 Award in heat pump systems (non-refrigerant circuits)",
  },
];

export function qualificationKnowledge(items: readonly Qualification[] = qualifications): string {
  const body = items.map((item) => `${item.title}. ${item.label}. ${item.summary}`).join(" ");
  const only = items.length === 1
    ? "That is the only qualification on the site."
    : "Those are the only qualifications on the site.";
  return `${body} ${only} Do not name any other qualification, certificate number or date. Do not say he is insured, G3, MCS, F-gas, Gas Safe, Benchmark or NICEIC registered. If they ask about those, say the site does not list them.`;
}

export function qualificationReply(items: readonly Qualification[] = qualifications): string {
  if (items.length === 0) {
    return "The site does not list a qualification. Ring Callum on 07846 729203, or use Get a quote.";
  }
  const body = items.map((item) => `${item.title}. ${item.label}. ${item.summary}`).join(" ");
  if (items.length === 1) {
    return `Callum holds the ${body} That is the only qualification listed on the site.`;
  }
  return `Callum holds these qualifications. ${body} Those are the only qualifications listed on the site.`;
}
