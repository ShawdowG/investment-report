# M-23 Rollback Playbook (Astro Cutover)

If production cutover causes regressions, use this rollback flow.

## Trigger conditions

- Production deploy fails repeatedly.
- Parity check fails (`scripts/parity-check.js`).
- Critical content mismatch in live report output.

## Immediate rollback steps

1. Re-deploy last known good commit:
   - `git checkout <last-good-sha>`
   - `git push origin HEAD:main --force-with-lease` (only if approved)
2. Re-run legacy index build path:
   - `node scripts/validate-reports.js`
   - `node scripts/build-index.js`
3. Confirm availability of:
   - `index.html`
   - `today.html`
   - `reports/html/*.html`

## Verification checklist

- `node scripts/parity-check.js` returns `PARITY_OK`.
- Latest date/slot report reachable in archive and permalink.
- `data/search-index.json` count matches report files.

## Recovery follow-up

- Document incident cause in migration progress log.
- Patch in branch and validate via preview workflow before re-cutover.
