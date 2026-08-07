import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { chatGPTSignInPath } from "./chatgpt-auth";
import { authorizeMarketplaceEmail, type MarketplaceEditor } from "./lib/marketplace-permissions";

export async function requireMarketplaceEditor(returnTo: string): Promise<MarketplaceEditor> {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  if (!email) redirect(chatGPTSignInPath(returnTo));
  const editor = authorizeMarketplaceEmail(email);
  if (!editor) redirect("/admin/marketplace?permission=required");
  return editor;
}
