# Knowledge Core Authorization

## Boundary

Authentication and authorization are separate.

- Authentication comes from the platform-provided `oai-authenticated-user-email` header.
- Authorization comes from the explicit server-only `MARKETPLACE_ADMIN_EMAILS` allowlist.

Every workflow read in the protected editor and every workflow mutation uses the centralized boundary. Missing identity returns 401 for APIs. Authenticated identities absent from the allowlist receive 403. Admin pages redirect unauthenticated users to platform sign-in and unauthorized users to the Marketplace admin permission notice.

## Configuration

`MARKETPLACE_ADMIN_EMAILS` is a comma-separated runtime value:

```text
admin-one@example.test,admin-two@example.test
```

Email matching is case-insensitive and surrounding whitespace is ignored. Every entry must be a usable email address. A missing, empty, or malformed value invalidates the complete allowlist and denies all Marketplace administration.

Authentication and authorization remain separate: a ChatGPT identity header identifies the caller, while this allowlist grants Marketplace administrator authority.

The variable name and fail-closed behavior are documented in `.env.example`; real administrator identities must be configured only through server-side Site runtime values.

## Central implementation

- `app/lib/marketplace-permissions.ts`: centralized email/request administrator authorization and safe 401/403 API responses.
- `app/marketplace-authorization.ts`: protected server-page enforcement before administrative UI renders.
- `app/api/marketplace/workflows/_shared.ts`: consistent API workflow lookup after authorization.

## Reviewer authorization

Allowlist membership grants administrator access. Workflow publication additionally requires:

- current status `in_review`;
- actor equals the workflow’s assigned reviewer;
- actor differs from workflow creator;
- all quality gates pass.

## Protected Marketplace boundary

The same helper protects the root admin page, workflow admin pages, administrative product reads, every product mutation, and every workflow mutation. Public `/marketplace` rendering remains unauthenticated and read-only.

## Tests

Tests verify:

- unauthenticated requests are rejected;
- authenticated but unauthorized requests are rejected;
- allowlisted administrator requests succeed;
- case-normalized email matching;
- missing, empty, and malformed configuration fails closed;
- unauthorized requests cannot reach database mutation code;
- assigned-reviewer publication rules;
- high-risk self-approval is blocked.
