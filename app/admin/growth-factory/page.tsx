import { requireMarketplaceAdministrator } from "../../marketplace-authorization";
import { GrowthFactory } from "./GrowthFactory";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "AI Growth Factory | Chef Gringo",
  robots: { index: false, follow: false },
};

export default async function GrowthFactoryPage() {
  await requireMarketplaceAdministrator("/admin/growth-factory");
  return <GrowthFactory />;
}
