import { requireMarketplaceEditor } from "../../../../marketplace-authorization";
import { WorkflowEditor } from "./WorkflowEditor";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Knowledge Core Workflow Editor",
  robots: { index: false, follow: false },
};

export default async function WorkflowEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireMarketplaceEditor(`/admin/marketplace/workflows/${encodeURIComponent(id)}`);
  return <WorkflowEditor workflowId={id} />;
}
