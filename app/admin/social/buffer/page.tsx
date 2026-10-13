import { requireMarketplaceAdministrator } from "../../marketplace-authorization";
import { BufferQuickPublish } from "./BufferQuickPublish";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Buffer Quick Publish | Chef Gringo",
  robots: { index: false, follow: false },
};

export default async function BufferQuickPublishPage() {
  await requireMarketplaceAdministrator("/admin/social/buffer");
  return <BufferQuickPublish />;
}
