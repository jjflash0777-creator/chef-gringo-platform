# Marketplace Write Authorization Resolution

## Original finding

The Knowledge Core workflow routes separate authentication from explicit editor authorization. Two pre-existing product-write routes do not:

- `POST /api/marketplace/products`
- `PATCH /api/marketplace/products/:id`

Both accepted any request carrying a platform-authenticated email. Authentication alone did not establish Marketplace authority.

## Resolved behavior

| Caller | Workflow writes | Product writes | Admin pages |
|---|---|---|
| No authenticated identity | 401 | 401 | Redirect to sign-in |
| Authenticated but absent from administrator allowlist | 403 | 403 | Denied before render |
| Allowlisted administrator | Allowed | Allowed | Allowed |

All Marketplace administrative surfaces now share `app/lib/marketplace-permissions.ts` and the server-only `MARKETPLACE_ADMIN_EMAILS` allowlist.

## Security properties

- Missing, empty, or malformed configuration denies all administrators.
- Emails are trimmed and compared case-insensitively.
- Unauthorized requests return before D1 is acquired or mutation input is processed.
- Product and workflow audit behavior remains unchanged for authorized administrators.
- Public Marketplace rendering remains public and read-only.

The original high-risk authorization inconsistency is resolved in this security slice.

No new roles, tables, admin redesign, or generalized RBAC system is required.

## Required tests

- Unauthenticated `POST` and `PATCH` return 401.
- Authenticated, non-allowlisted `POST` and `PATCH` return 403.
- Allowlisted administrator requests retain current success behavior.
- Email comparison remains case-insensitive.
- Empty/malformed allowlist fails closed.
- Existing validation errors and audit events still behave as before.
- Workflow authorization tests remain unchanged and passing.

## Deployment requirement

Configure `MARKETPLACE_ADMIN_EMAILS` as a server-side runtime value before deploying administrative Marketplace capabilities. Never expose it through a `NEXT_PUBLIC_*` variable.
