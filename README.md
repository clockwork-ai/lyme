# Lyme Plumbing & Heating

Static site for Callum Broadfoot, sole trader, based in High Lane (SK6). Phone 07846 729203.

The public site is [https://lymeplumbing.co.uk](https://lymeplumbing.co.uk). Page addresses have no `.html`. Canonical links, Open Graph URLs, the sitemap and the business schema all use that domain.

## Cloudflare Workers

Host this as a Worker with static assets, using Workers Builds (Git-connected). A Pages project cannot use the `send_email` binding.

In the Cloudflare dashboard: **Workers & Pages** > **Create** > **Worker** > **Import a repository**.

| Setting | Value |
| --- | --- |
| Repository | this repository |
| Production branch | `main` |
| Build command | None |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/` |

Do not set a Pages build output directory. `wrangler.toml` serves `public/` as static assets. `README.md`, `wrangler.toml`, `src/` and `functions/` stay outside that folder, so they are not published.

Add the custom domains on the Worker: `lymeplumbing.co.uk` and `www.lymeplumbing.co.uk`. Add `lymeplumbing.uk` and `www.lymeplumbing.uk` the same way if those hostnames should open the site. This repository does not change DNS, MX or Email Routing records.

`public/_redirects` is the Workers static-asset redirect file (same line format as Pages). There is no `_headers` file.

### Email binding

The quote form sends mail with Cloudflare Email Sending (`send_email`). The destination is already a verified Email Routing destination on `lymeplumbing.co.uk`.

`wrangler.toml` sets the binding. Workers Builds applies it when the deploy command runs. Pull request builds use `npx wrangler preview`, which needs the `previews` block in that file. The email binding stays on production. Preview hostnames are refused by the quote form, so the binding is not copied into `previews`.

| Type | Variable name | Destination |
| --- | --- | --- |
| Send Email (`send_email`) | `EMAIL` | `lymeplumbingandheating@gmail.com` |

`src/worker.js` handles `POST /api/quote` and reads `env.EMAIL`. Everything else is passed to the assets binding. The From address is `quotes@lymeplumbing.co.uk`. That sender has to be allowed on the zone that already has Email Routing. Adding the binding is a Worker setting, not a DNS change.

### Quote form

`public/contact/index.html` posts to `/api/quote` as `multipart/form-data`.

Fields: name, phone, email (optional), postcode, job, message, best time to call, consent tick box, photos (optional), and a honeypot named `hp` that people should leave blank. The field is off screen so a person does not fill it. If it has a value, the handler pretends the form succeeded and does not send an email.

Limits: up to 4 photos, 3MB each, 8MB together. JPG, PNG, WEBP, GIF or HEIC.

- Success: `303` redirect to `/thanks/`
- Something wrong with the form: an HTML page that says what to fix, with the phone number
- Honeypot filled: redirect to `/thanks/` and no email is sent
- The email binding missing, or the send failing: an HTML page asking the customer to call or text

The posted Origin must be `https://lymeplumbing.co.uk`, `https://www.lymeplumbing.co.uk`, `https://lymeplumbing.uk` or `https://www.lymeplumbing.uk` (or localhost on port 8787 or 8788 while trying the Worker). Other hostnames, including a `*.workers.dev` preview, are refused until that hostname is added in `functions/_lib/quote-mail.js`.

## Ask Lyme

A floating chat button on every page. The script and stylesheet load after the page is idle. The assistant answers from what is published on this site. The system prompt stays on the server, in `lib/business.ts`.

It will not quote a price. Callum quotes after he has seen the job. It will not do boiler, gas or refrigerant work. If water is leaking, it tells the visitor to turn the water off at the stop tap, keep it away from electrics, and ring 07846 729203. The site does not describe a 12 month labour guarantee or a handover pack, so the chat will not invent either.

The home page trust strip and the heat pump page wording live in `lib/qualifications.ts` (`homeTrustStrip` and `heatPumpLine`). The home strip is "City & Guilds qualified plumber · BPEC Level 3 heat pump qualified · Local to High Lane". The heat pump page says he services, repairs and maintains air source heat pumps, whoever fitted them, on the plumbing side, and that he is BPEC Level 3 qualified in heat pump systems. The About page still lists City & Guilds qualified, and the BPEC Level 3 Award in the Installation and Maintenance of Heat Pump Systems (Non-refrigerant Circuits), Ofqual regulated. The chat names those and no others. It does not say accredited, certified, approved installer, MCS, grant or BUS, and it does not claim F-gas, Gas Safe, G3, Benchmark, NICEIC or insurance.

Reviews are hidden. `SHOW_REVIEWS` at the top of `public/assets/site.js` is false, so the nav, menu, footer and home section do not link to `/reviews/`. The page file is still `public/reviews/index.html`. Set the flag to true, and add the reviews address back to `public/sitemap.xml`, to show it again.

The widget shows three suggestion chips, and only before the first message. On a phone, the panel follows the visible viewport, so the close button and the input stay on screen when the keyboard is open. Replies do not contain a web address. Buttons under a reply are Get a quote and Call. There is no WhatsApp link on the site, so the chat does not offer one.

### How a reply is written

The chat route is `GET` and `POST /api/chat`, handled by `src/worker.js`. `GET` returns the button wording. `POST` answers.

Cloudflare Workers AI does the open questions. `wrangler.toml` sets the binding `AI`. There is no model API key and no secret to add for the chat. The model id lives in `lib/business.ts` (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`). Set the var `AI_MODEL` only if you want a different Workers AI model. `remote = false` on the binding applies to local `wrangler dev` only.

If the `AI` binding is missing, `GET /api/chat` returns `{ "enabled": false }` and the button is not added to the page. A fixed safety reply (a leak, a boiler, a price, a quote) does not need the model. Anything else, when the model cannot answer, tells the visitor to ring or use Get a quote.

A server-side check removes prices, em dashes, en dashes, and raw addresses before the visitor sees them.

### Where chat leads go

The form inside the chat posts to `POST /api/quote` as `multipart/form-data`, the same route as the contact page. It asks for the same fields, including the consent tick. The quote handler still checks the Origin. A preview hostname is still refused, so a chat lead from a `*.workers.dev` URL does not email anyone. On the real site, the email goes to `lymeplumbingandheating@gmail.com`, from `quotes@lymeplumbing.co.uk`, the same as the contact form. The message starts with "From the site chat." so you can tell them apart.

The email binding stays on production only. It is not copied into `[previews]`. The Workers AI binding is copied there, so a pull request preview can still answer. It does not send mail.

## Preview

Paths to CSS, scripts and other pages are relative. Serve the `public/` folder for a root-domain preview of the pages. The quote form itself only works through `npx wrangler dev` or the deployed Worker, because `POST /api/quote` is handled by `src/worker.js`.

## Fonts

Archivo and Geist are in `public/assets/fonts/`. The site does not call Google Fonts.
