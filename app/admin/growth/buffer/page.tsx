import { requireMarketplaceAdministrator } from "../../marketplace-authorization";
import { BufferPublisher } from "./BufferPublisher";

export const dynamic = "force-dynamic";
export const metadata = { title: "Approved Buffer Publishing | Chef Gringo", robots: { index: false, follow: false } };

export default async function BufferPublishingPage() {
  await requireMarketplaceAdministrator("/admin/growth/buffer");
  return <BufferPublisher />;
}
