# Knowledge Core Authorization

## Boundary

Authentication and authorization are separate.

- Authentication comes from the platform-provided `oai-authenticated-user-email` header.
- Authorization comes from the explicit `CHEF_GRINGO_EDITOR_EMAILS` allowlist.

Every workflow read in the protected editor and every workflow mutation uses the centralized boundary. Missing identity returns 401 for APIs. Authenticated identities absent from the allowlist receive 403. Admin pages redirect unauthenticated users to platform sign-in and unauthorized users to the Marketplace admin permission notice.

## Configuration

`CHEF_GRINGO_EDITOR_EMAILS` is a comma-separated runtime value:

```text
editor@example.com:editor,owner@example.com:admin
```

Email matching is case-insensitive. Supported pilot permissions are `editor` and `admin`; both can edit workflows. The distinction is retained for future narrow policy changes, but no broad role system was built.

If the allowlist is empty, workflow administration fails closed.

The value must be configured through the Site runtime-value controls for any future deployment. It is not committed to source or `.env.example` because it contains environment-specific identities.

## Central implementation

- `app/lib/marketplace-permissions.ts`: pure email/request authorization and safe API responses.
- `app/marketplace-authorization.ts`: protected server-page enforcement.
- `app/api/marketplace/workflows/_shared.ts`: consistent API workflow lookup after authorization.

## Reviewer authorization

Allowlist permission grants editor access. Publication additionally requires:

- current status `in_review`;
- actor equals the workflow’s assigned reviewer;
- actor differs from workflow creator;
- all quality gates pass.

## Technical debt outside this pilot

The pre-existing product routes still treat authentication as sufficient authorization:

- `POST /api/marketplace/products`
- `PATCH /api/marketplace/products/:id`

They were deliberately not refactored because the sprint forbids unrelated expansion. They remain documented technical debt and should adopt the centralized allowlist in a separate targeted change.

## Tests

Tests verify:

- unauthenticated requests are rejected;
- authenticated but unauthorized requests are rejected;
- allowlisted editor requests succeed;
- case-normalized email matching;
- assigned-reviewer publication rules;
- high-risk self-approval is blocked.
