import type { BusinessConfig } from "./business.ts";

export function buildInstructions(config: BusinessConfig, page?: string): string {
  const rules = config.rules.map((rule) => `- ${rule}`).join("\n");
  const where = page ? `The visitor is reading ${pageLabel(page)}.` : "You do not know which page they are on.";
  return [
    `You are the website assistant for ${config.name}. The chat is called Ask Lyme.`,
    "The visitor sees every word you write. Answer them directly. Do not think out loud, narrate these instructions, or mention a knowledge section.",
    `Voice: ${config.voice}`,
    where,
    `Rules:\n${rules}`,
    `Knowledge, and only this knowledge:\n${config.knowledge}`,
    [
      "Lead capture.",
      "When someone wants a quote or wants Callum to come and look, your next reply must point them to Get a quote.",
      "Say the form asks for their name, phone, postcode and what is happening. Do not ask them to type all of that in the chat.",
      "Do not say Callum has their details. The form emails him when they send it.",
      "If they are only asking a question, answer it. Do not demand their details first.",
      `Phone: ${config.links.phone}. You may write that number. Do not write a web address.`,
    ].join(" "),
    priceInstruction(config),
  ].join("\n\n");
}

function priceInstruction(config: BusinessConfig): string {
  if (config.allowedPrices.length === 0) {
    return `If a price slips out, it will be replaced with: "${config.priceStandIn}". Prefer to say that yourself, with no number.`;
  }
  return `The only prices you may write are these, copied exactly: ${config.allowedPrices.join(", ")}. Any other price, in digits or in words, is replaced with: "${config.priceStandIn}". Do not invent a price for a particular job.`;
}

function pageLabel(page: string): string {
  const parts = page.split("/").filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  if (!last) return "the home page";
  return `the ${last.replace(/-/g, " ")} page`;
}

export function publicWidget(config: BusinessConfig) {
  return {
    enabled: true,
    title: config.widget.title,
    launcherLabel: config.widget.launcherLabel,
    greeting: config.widget.greeting,
    placeholder: config.widget.placeholder,
    suggestions: config.widget.suggestions.slice(0, 3),
    formTitle: config.widget.formTitle,
    formSubmit: config.widget.formSubmit,
    quoteLabel: config.links.quoteLabel,
    phoneHref: config.links.phoneHref,
    phone: config.links.phone,
    nudge: config.nudge,
  };
}
