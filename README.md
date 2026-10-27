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

## Preview

Paths to CSS, scripts and other pages are relative. Serve the `public/` folder for a root-domain preview of the pages. The quote form itself only works through `npx wrangler dev` or the deployed Worker, because `POST /api/quote` is handled by `src/worker.js`.

## Fonts

Archivo and Geist are in `public/assets/fonts/`. The site does not call Google Fonts.
