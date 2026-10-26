# Lyme Plumbing & Heating

Static site for Callum Broadfoot, sole trader, based in High Lane (SK6). Phone 07846 729203.

The public site is [https://lymeplumbing.co.uk](https://lymeplumbing.co.uk). Page addresses have no `.html`. Canonical links, Open Graph URLs, the sitemap and the business schema all use that domain.

## Cloudflare Pages

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Build command | None |
| Build output directory | `/` (the repository root) |
| Root directory | `/` |
| Functions | `functions/` (Pages default). `functions/api/quote.js` handles `POST /api/quote` |

Attach the custom domain in the Pages project. This repository does not change DNS, MX or Email Routing records.

### Email binding

The quote form sends mail with Cloudflare Email Sending (`send_email`). The destination is already a verified Email Routing destination on `lymeplumbing.co.uk`.

In the Pages project, add a binding (or deploy with the `wrangler.toml` in this repo):

| Type | Variable name | Destination |
| --- | --- | --- |
| Send Email (`send_email`) | `EMAIL` | `lymeplumbingandheating@gmail.com` |

`functions/api/quote.js` reads `env.EMAIL`. The From address is `quotes@lymeplumbing.co.uk`. That sender has to be allowed on the zone that already has Email Routing. Adding the binding is a Pages setting, not a DNS change.

`wrangler.toml` sets the same binding for `npx wrangler pages deploy .`

### Quote form

`contact/index.html` posts to `/api/quote` as `multipart/form-data`.

Fields: name, phone, email (optional), postcode, job, message, best time to call, consent tick box, photos (optional), and a honeypot named `hp` that people should leave blank. The field is off screen so a person does not fill it. If it has a value, the function pretends the form succeeded and does not send an email.

Limits: up to 4 photos, 3MB each, 8MB together. JPG, PNG, WEBP, GIF or HEIC.

- Success: `303` redirect to `/thanks/`
- Something wrong with the form: an HTML page that says what to fix, with the phone number
- Honeypot filled: redirect to `/thanks/` and no email is sent
- The Pages binding missing, or the send failing: an HTML page asking the customer to call or text

The posted Origin must be `https://lymeplumbing.co.uk` (or `www`, or localhost while trying the function). A `*.pages.dev` preview will be refused until that hostname is added in `functions/_lib/quote-mail.js`.

## Preview

Paths to CSS, scripts and other pages are relative, so the files also work on a GitHub Pages project URL such as `/lyme/`. Serve the repository root for a root-domain preview. The quote form itself only works once the Pages Function and the email binding are deployed.

## Fonts

Archivo and Geist are in `assets/fonts/`. Pages do not call Google Fonts.
