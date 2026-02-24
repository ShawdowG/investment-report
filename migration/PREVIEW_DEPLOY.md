# M-10 Preview Deployment Target

Preview deployment target for migration web app (`web-next`): **GitHub Pages**.

## Workflow

- CI workflow: `.github/workflows/web-next-preview.yml`
- On PR: builds Astro output and uploads artifact `web-next-preview`.
- On push to `main`: builds + deploys `web-next/dist` to GitHub Pages.

## Why this target

- Zero additional infrastructure during migration.
- Fast review loop for parity checks (M-17/M-18).
- Public/static hosting matches Astro `output: static` mode.

## Runtime assumptions

- Node 20 in CI.
- `web-next` dependencies installed during workflow.
- Data sourced from repo files (`data/`, `reports/`) at build time.
