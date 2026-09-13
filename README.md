# Chef Gringo — Foundation Sprint 01

Public marketing foundation for Chef Gringo’s hospitality career, education, operations, and entrepreneurship platform.

## Run locally

```bash
npm install
npm run dev
```

## Validate

```bash
npm ci
npm run lint
npm run typecheck
npm run build
npm test
NEXT_PUBLIC_SITE_URL=https://chefgringo.com npm run release:validate
```

## Environment

- `NEXT_PUBLIC_SITE_URL`: canonical public origin. Production releases must use `https://chefgringo.com`.
- `CHEF_GRINGO_ENVIRONMENT`: optional environment label written into the build fingerprint. Must not be `staging` when packaging for production.
- `EARLY_ACCESS_ENDPOINT`: Loops contacts update endpoint (`https://app.loops.so/api/v1/contacts/update`) using HTTP PUT for idempotent update-or-create.
- `EARLY_ACCESS_TOKEN`: Loops API key used as a server-side bearer token.
- `EMAIL_SUBSCRIBE_ENDPOINT` and `EMAIL_SUBSCRIBE_TOKEN`: backwards-compatible fallback names used by the existing email adapter.

Before enabling Loops in production, create matching Loops contact properties for `role`, `interest`, `consentMarketing`, and `policyVersion`.

If no endpoint is configured, early-access signup returns an honest unavailable state and does not claim data was persisted.

## Internal architecture

- [`docs/SYSTEM_ARCHITECTURE.md`](docs/SYSTEM_ARCHITECTURE.md) — permanent technical blueprint
- [`docs/ENGINEERING_HANDOFF.md`](docs/ENGINEERING_HANDOFF.md) — operational handbook and current state
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Sites project identity and release validation
- [`docs/foundation`](docs/foundation) — product governance and constraints
