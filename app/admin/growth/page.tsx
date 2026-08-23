import { requireMarketplaceAdministrator } from "../../marketplace-authorization";
import { GrowthQueue } from "./GrowthQueue";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Social Growth Queue",
  robots: { index: false, follow: false },
};

export default async function SocialGrowthQueuePage() {
  await requireMarketplaceAdministrator("/admin/growth");
  return <GrowthQueue />;
}
