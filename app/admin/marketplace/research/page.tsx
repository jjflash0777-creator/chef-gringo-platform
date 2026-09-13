import { requireMarketplaceAdministrator } from "../../../marketplace-authorization";
import { BoundedResearchWorkspace } from "./BoundedResearchWorkspace";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bounded research", robots: { index: false, follow: false } };

export default async function BoundedResearchAdminPage() {
  await requireMarketplaceAdministrator("/admin/marketplace/research");
  return <BoundedResearchWorkspace />;
}
