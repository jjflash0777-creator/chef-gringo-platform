# Chef Gringo MVP

Production-ready first version of Chef Gringo: favorite-food makeovers, senior and caregiver kitchen guidance, professional culinary resources, and a deterministic recipe scaler.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by the development server.

## Environment

Copy `.env.example` to `.env.local` when connecting production services.

- `NEXT_PUBLIC_SITE_URL`: canonical public origin.
- `EMAIL_SUBSCRIBE_ENDPOINT`: server-side HTTPS endpoint that accepts `{ email, source }`.
- `EMAIL_SUBSCRIBE_TOKEN`: optional bearer token sent server-side.

When the email endpoint is absent, signup returns an honest unavailable message and does not simulate success.

## Validation

```bash
npm run lint
npm run build
npm test
```
