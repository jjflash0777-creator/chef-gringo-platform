import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { chatGPTSignInPath } from "./chatgpt-auth";
import { authorizeMarketplaceEmail, type MarketplaceAdministrator } from "./lib/marketplace-permissions";

export async function requireMarketplaceAdministrator(returnTo: string): Promise<MarketplaceAdministrator> {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  if (!email) redirect(chatGPTSignInPath(returnTo));
  const administrator = authorizeMarketplaceEmail(email);
  if (!administrator) redirect("/marketplace?admin=forbidden");
  return administrator;
}
