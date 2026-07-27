import { requireChatGPTUser } from "../../chatgpt-auth";
import { ProductWorkspace } from "./ProductWorkspace";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Marketplace Admin",
  robots: { index: false, follow: false },
};

export default async function MarketplaceAdminPage() {
  await requireChatGPTUser("/admin/marketplace");
  return <ProductWorkspace />;
}
