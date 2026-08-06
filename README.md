# Chef Gringo — Foundation Sprint 01

Public marketing foundation for Chef Gringo’s hospitality career, education, operations, and entrepreneurship platform.

## Run locally

```bash
npm install
npm run dev
```

## Validate

```bash
npm run lint
npm run typecheck
npm run build
npm test
```

## Environment

- `NEXT_PUBLIC_SITE_URL`: canonical public origin.
- `EARLY_ACCESS_ENDPOINT`: server-side HTTPS endpoint that accepts early-access JSON.
- `EARLY_ACCESS_TOKEN`: optional server-side bearer token.
- `EMAIL_SUBSCRIBE_ENDPOINT` and `EMAIL_SUBSCRIBE_TOKEN`: backwards-compatible fallback names used by the existing email adapter.

If no endpoint is configured, early-access signup returns an honest unavailable state and does not claim data was persisted.

## Internal architecture

- [`docs/SYSTEM_ARCHITECTURE.md`](docs/SYSTEM_ARCHITECTURE.md) — permanent technical blueprint
- [`docs/ENGINEERING_HANDOFF.md`](docs/ENGINEERING_HANDOFF.md) — operational handbook and current state
- [`docs/foundation`](docs/foundation) — product governance and constraints
