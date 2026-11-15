<!-- Lyme pull request. Fill every section. Delete nothing. Previews stay open until Callum says merge. -->

## What changed

One or two plain sentences. What a visitor will notice, and what they will not.

## Why

The brief or decision this comes from (link the Drive brief, DONE file or DECISIONS line).

## Preview link

- Cloudflare preview (`*.workers.dev`, from the pull request build): <!-- https://... -->
- The quote form refuses preview hostnames by design, so test the form only on production after merge.

## Screenshots

Desktop (1440 wide) and mobile (390 wide) of every page this PR touches. Before and after where the change is visible.

| Page | Desktop | Mobile |
|---|---|---|
|  |  |  |

## Checks

Paste the real output, not a tick.

- [ ] `npm test` passed (count: )
- [ ] `npm run measure` run if `measure.js` changed, and every page still has `measure:start` and `measure:end`
- [ ] No em dashes, no price or phone number changes, no banned claim words (gas, boiler, Gas Safe, MCS, grant, accredited, certified, insured)
- [ ] 07985 379605 does not appear anywhere
- [ ] `GSC_VERIFICATION` untouched, no DNS or email routing change
- [ ] Preview opened and walked on a phone

## Rollback version id

The current production version id before this merges (Cloudflare dashboard, Workers & Pages, lyme-plumbing, Deployments, top row): <!-- version id -->

## Needs Callum: yes / no

If yes, list each decision in one line.

## What could break

One to three lines on the riskiest part and how to spot it.
