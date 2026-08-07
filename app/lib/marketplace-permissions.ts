export type MarketplaceAdministrator = {
  email: string;
};

const ADMIN_EMAIL_ENV = "MARKETPLACE_ADMIN_EMAILS";
const EMAIL_PATTERN = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;

function configuredAdministrators(value: string | undefined) {
  if (!value?.trim()) return null;
  const entries = value.split(",");
  const administrators = new Set<string>();
  for (const entry of entries) {
    const email = entry.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) return null;
    administrators.add(email);
  }
  return administrators.size ? administrators : null;
}

export function authorizeMarketplaceEmail(
  email: string | null,
  configuration = process.env[ADMIN_EMAIL_ENV],
): MarketplaceAdministrator | null {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail || !EMAIL_PATTERN.test(normalizedEmail)) return null;
  const administrators = configuredAdministrators(configuration);
  return administrators?.has(normalizedEmail) ? { email: normalizedEmail } : null;
}

export function authorizeMarketplaceRequest(
  request: Request,
  configuration = process.env[ADMIN_EMAIL_ENV],
): MarketplaceAdministrator | null {
  return authorizeMarketplaceEmail(request.headers.get("oai-authenticated-user-email"), configuration);
}

export function marketplaceAuthorizationResponse(request: Request) {
  const email = request.headers.get("oai-authenticated-user-email");
  if (!email) return Response.json({ error: "Authentication required." }, { status: 401 });
  return Response.json({ error: "Marketplace administrator permission required." }, { status: 403 });
}
