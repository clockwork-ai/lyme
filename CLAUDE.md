# Lyme Plumbing & Heating site (clockwork-ai/lyme)

Standing rules for anyone, human or assistant, working in this repo. Read before changing anything. Cursor reads the same text if it is copied to `AGENTS.md`; keep the two identical if both exist.

## What this is

The static site for Callum Broadfoot's plumbing and heating business, served by a Cloudflare Worker with static assets (`wrangler.toml`, Worker name `lyme-plumbing`). Live at https://lymeplumbing.co.uk. The quote form posts to `/api/quote` and emails the Lyme Gmail; "Ask Lyme" is the chat route in `src/worker.js`. Enquiries are also handed to Clockwork Jobs (`functions/_lib/jobs-enquiry.js`).

## Standing rules

- British English. No em dashes and no en dashes anywhere, including code comments and commit messages. Write ranges as "3 to 5".
- No phone number or price changes without Callum's approval. The call-out rates on the site were agreed by Callum on 31 Oct 2026; do not alter them.
- Never touch Search Console verification: the token lives in `GSC_VERIFICATION` in `public/assets/measure.js` and is written into every page by `npm run measure`. Do not change, remove or invent it, and never change DNS for it.
- Keep the `<!-- measure:start -->` and `<!-- measure:end -->` comments in every page in `public/`. `scripts/apply-measure.mjs` rewrites the Plausible block between them. Pages without the markers silently lose measurement.
- Customer-facing work stays in a preview or a pull request until Callum says merge. Never push to `main`. Never merge your own pull request.
- Do not change DNS, MX, Email Routing or the `send_email` destination from this repo or from the Cloudflare dashboard. The email binding stays on production only.
- No keys, tokens or secrets in any file. The Worker secrets (such as `JOBS_ENQUIRY_KEY`) are set in the Cloudflare dashboard by Callum.
- Do not invent facts, reviews or figures. Published reviews are word for word from Google.

## Lyme wording rules

- Lyme does no gas or boiler work. Make no Gas Safe, F-gas, MCS, grant, BUS, G3, Benchmark, NICEIC, "accredited", "certified", "approved installer" or "insured" claims, and do not name a qualification for unvented cylinders. The only qualification wordings are "City & Guilds qualified plumber" and "BPEC Level 3 heat pump qualified", from `lib/qualifications.ts`.
- Numbers: calls and texts are the Twilio number 07846 729203. WhatsApp is 07359 838866 (https://wa.me/447359838866). Never use 07985 379605 publicly, in copy, links, schema or screenshots.
- Lyme is not VAT registered: never add VAT or write "plus VAT".
- Refer to customers by first name and area only, in copy, commit messages, pull requests and briefs.
- Fixed prices only; bigger jobs get a free quote. The chat may repeat the published call-out rates and nothing else.

## How to test

    npm ci
    npm test            # node --test lib/*.test.ts server/*.test.ts

Serve `public/` for a page preview. The quote form and chat only work through `npx wrangler dev` (needs the Cloudflare login) or a deployed preview. After editing `public/assets/measure.js`, run `npm run measure` and commit the page changes it makes. Check a changed page at 390 and 1440 wide and note it in the pull request.

## How to deploy

Merging to `main` on GitHub triggers Cloudflare Workers Builds, which runs `npx wrangler deploy`. Nothing else deploys production. Pull request builds run `npx wrangler preview` on a `*.workers.dev` address; the quote form refuses preview hostnames, so a preview never emails anyone.

## How to roll back

Only Callum rolls back. Steps:

1. Find the previous production version. Cloudflare dashboard: Workers & Pages, `lyme-plumbing`, Deployments tab. The top entry is live; the one below is the previous version, with its version id and the commit it came from. From a terminal with the Cloudflare login: `npx wrangler deployments list` shows the same.
2. Roll back from that previous entry with "Rollback" in the dashboard, or `npx wrangler rollback <version-id>`.
3. Note the version id in the pull request or hub log, then fix forward on a branch.
4. A rollback changes the Worker code and assets only. It never changes DNS, Email Routing or secrets.

## Where things are

- `public/`: the pages. `public/_redirects`: redirects. `public/sitemap.xml`.
- `lib/business.ts`: chat wording, rules and knowledge. `lib/qualifications.ts`: the trust strip and heat pump line.
- `functions/_lib/quote-mail.js`: allowed form origins. `functions/_lib/jobs-enquiry.js`: hand-off to Clockwork Jobs (`JOBS_DEFAULT_URL`).
- `wrangler.toml`: `REVIEWS_UPSTREAM` for live Google reviews; the `[previews]` block must stay or pull request builds stop.
