import { requireMarketplaceAdministrator } from "../../marketplace-authorization";
import { ProductWorkspace } from "./ProductWorkspace";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Marketplace Admin",
  robots: { index: false, follow: false },
};

export default async function MarketplaceAdminPage() {
  await requireMarketplaceAdministrator("/admin/marketplace");
  return <ProductWorkspace />;
}
