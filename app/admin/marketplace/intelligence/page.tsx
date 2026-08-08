import { requireMarketplaceAdministrator } from "../../../marketplace-authorization";
import { IntelligenceLab } from "./IntelligenceLab";

export const dynamic = "force-dynamic";
export const metadata = { title: "Intelligence Lab", robots: { index: false, follow: false } };

export default async function IntelligenceLabPage() {
  await requireMarketplaceAdministrator("/admin/marketplace/intelligence");
  return <IntelligenceLab />;
}
