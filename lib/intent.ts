import type { BusinessConfig } from "./business.ts";

const LEAK = /\b(leak(?:ing|ed)?|burst|flood(?:ing)?|gushing)\b/i;
const WATER_NOW = /water (?:is )?(?:coming|pouring|running) through|water everywhere|burst pipe/i;
const ACTIVE = /\b(i've|i have|we've|we have|my |there's|there is|help|emergency|urgent|right now|won't stop|wont stop)\b/i;
const BOILER = /\b(boilers?|combi|gas fire|gas hob|gas cooker|gas leak|gas work)\b/i;
const REFRIGERANT = /\b(refrigerants?|f-?gas|regas|re-gas|gas charge)\b/i;
const GUARANTEE = /\b(guarantee|warranty|handover|service reminders?)\b/i;
const REVIEWS = /\b(reviews?|testimonials?|star ratings?|rated)\b/i;
const PRICE = /\b(how much|what(?:'s| is) the (?:price|cost)|price list|what do you charge|how much do you charge)\b|£\s?\d/i;
const QUOTE = /\b(get a quote|quote for|want a quote|like a quote|can i get a quote)\b/i;

export function fixedReply(text: string, config: BusinessConfig): string | null {
  const leak = LEAK.test(text) || WATER_NOW.test(text);
  const active = ACTIVE.test(text) || WATER_NOW.test(text) || /^i've got a leak\.?$/i.test(text.trim());
  const boiler = BOILER.test(text);
  if (leak && active && boiler) return config.fixed.boilerLeak;
  if (leak && active) return config.fixed.emergency;
  const askingStatus = /\b(are you|is he|is callum|do you have|does he have|does callum have)\b/i.test(text);
  if (askingStatus && /\b(gas safe|g3|mcs|f-?gas|niceic|benchmark|insured|insurance|qualified|qualifications|certified|registered)\b/i.test(text)) {
    return config.fixed.qualification;
  }
  if (REFRIGERANT.test(text)) return config.fixed.refrigerant;
  if (boiler || /\bgas safe\b/i.test(text)) return config.fixed.boiler;
  if (GUARANTEE.test(text)) return config.fixed.guarantee;
  if (REVIEWS.test(text)) return config.fixed.reviews;
  if (PRICE.test(text)) return config.fixed.price;
  if (QUOTE.test(text)) return config.fixed.quote;
  return null;
}
