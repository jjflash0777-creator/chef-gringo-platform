# Chef Gringo deployment notes

## Sites project identity (authoritative)

| Role | Opaque project ID | Notes |
|------|-------------------|-------|
| **Production** | `appgprj_6a88d56167a08191bb0c358e41fd62f6` | Active `chefgringo.com` custom domain and live D1 `DB` binding. Tracked in `.openai/hosting.json`. |
| **Legacy MVP** | `appgprj_6a66280686748191931a0ed1cbde7a20` | Historical `chef-gringo-mvp` project. No custom domain. No D1. **Not production.** |

Titles in the Sites UI are not authoritative. Always confirm the opaque ID.

## Pre-promotion checklist

1. `npm ci` from a clean checkout (no reused `node_modules`).
2. `npm run lint`
3. `npm run typecheck`
4. `npm run build`
5. `npm test`
6. `NEXT_PUBLIC_SITE_URL=https://chefgringo.com npm run release:validate`

`release:validate` confirms production project ID, production site URL, rejects `CHEF_GRINGO_ENVIRONMENT=staging`, checks the packaged homepage for `/brand/editorial/hero-kitchen.jpg` and current homepage copy, and rejects stale `dist/` via `dist/.openai/build-fingerprint.json`.

## Build fingerprint

Each production build writes `dist/.openai/build-fingerprint.json` with:

- `commitSha`
- `builtAt`
- `environment`
- `sitesProjectId`
- `homepageSourceHash`

## Do not

- Deploy without explicit founder authorization.
- Change Sites environment variables as part of routine packaging.
- Retarget `.openai/hosting.json` to the legacy MVP project ID.
