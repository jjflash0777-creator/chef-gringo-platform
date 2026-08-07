export type MarketplaceEditor = {
  email: string;
  permission: "editor" | "admin";
};

function configuredPermissions(value = process.env.CHEF_GRINGO_EDITOR_EMAILS || "") {
  const permissions = new Map<string, MarketplaceEditor["permission"]>();
  for (const entry of value.split(",")) {
    const [rawEmail, rawPermission = "editor"] = entry.trim().split(":");
    const email = rawEmail?.trim().toLowerCase();
    const permission = rawPermission?.trim() === "admin" ? "admin" : "editor";
    if (email) permissions.set(email, permission);
  }
  return permissions;
}

export function authorizeMarketplaceEmail(
  email: string | null,
  configuration = process.env.CHEF_GRINGO_EDITOR_EMAILS || "",
): MarketplaceEditor | null {
  if (!email) return null;
  const permission = configuredPermissions(configuration).get(email.trim().toLowerCase());
  return permission ? { email: email.trim().toLowerCase(), permission } : null;
}

export function authorizeMarketplaceRequest(
  request: Request,
  configuration = process.env.CHEF_GRINGO_EDITOR_EMAILS || "",
): MarketplaceEditor | null {
  return authorizeMarketplaceEmail(request.headers.get("oai-authenticated-user-email"), configuration);
}

export function marketplaceAuthorizationResponse(request: Request) {
  const email = request.headers.get("oai-authenticated-user-email");
  if (!email) return Response.json({ error: "Authentication required." }, { status: 401 });
  return Response.json({ error: "Marketplace editorial permission required." }, { status: 403 });
}
