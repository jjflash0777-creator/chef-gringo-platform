# Marketplace Write Authorization Debt

## Finding

The Knowledge Core workflow routes separate authentication from explicit editor authorization. Two pre-existing product-write routes do not:

- `POST /api/marketplace/products`
- `PATCH /api/marketplace/products/:id`

Both call `requireAuthenticatedUser()` and accept any request carrying a platform-authenticated email. They do not call `authorizeMarketplaceRequest()` or evaluate `CHEF_GRINGO_EDITOR_EMAILS`.

## Current behavior

| Caller | Workflow writes | Product writes |
|---|---|---|
| No authenticated identity | 401 | 401 |
| Authenticated but absent from editor allowlist | 403 | Allowed |
| Allowlisted editor/admin | Allowed | Allowed |

This creates inconsistent authorization inside the same Marketplace administration surface.

## Exposure risk

- Any authenticated user who can reach the API may create or modify product records.
- Product claims, affiliate metadata, editorial status, recommendations, and Marketplace trust disclosures could be changed without editor authorization.
- Authentication headers are platform-controlled, but identity alone is not a least-privilege authorization policy.
- Audit events record product writes but do not prevent unauthorized changes.
- A preview containing Knowledge Core administration would present a stronger workflow boundary beside weaker legacy product writes, increasing the chance that reviewers infer consistent protection where none exists.

Risk classification: **High before broader preview access or any production deployment containing Marketplace administration.**

## Smallest remediation

1. Replace the authentication-only check in both product routes with the centralized Marketplace authorization function.
2. Preserve 401 for missing identity and return 403 for authenticated identities outside `CHEF_GRINGO_EDITOR_EMAILS`.
3. Keep existing product validation, SQL, response shapes, and audit behavior unchanged.
4. Fail closed when the allowlist is empty.
5. Document the shared authorization boundary for all Marketplace writes.

No new roles, tables, admin redesign, or generalized RBAC system is required.

## Required tests

- Unauthenticated `POST` and `PATCH` return 401.
- Authenticated, non-allowlisted `POST` and `PATCH` return 403.
- Allowlisted editor/admin requests retain current success behavior.
- Email comparison remains case-insensitive.
- Empty/malformed allowlist fails closed.
- Existing validation errors and audit events still behave as before.
- Workflow authorization tests remain unchanged and passing.

## Deployment recommendation

Remediate before any new preview deployment that exposes the Knowledge Core admin to additional authenticated users, and before production deployment. This sprint documents rather than changes the routes, as required.
