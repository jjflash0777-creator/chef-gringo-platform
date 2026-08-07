import { requireMarketplaceEditor } from "../../../../marketplace-authorization";
import { NewWorkflowForm } from "./NewWorkflowForm";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Create Knowledge Core Workflow",
  robots: { index: false, follow: false },
};

export default async function NewWorkflowPage() {
  await requireMarketplaceEditor("/admin/marketplace/workflows/new");
  return <NewWorkflowForm />;
}
