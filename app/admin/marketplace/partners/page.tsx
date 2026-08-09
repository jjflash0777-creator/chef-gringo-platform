import { requireMarketplaceAdministrator } from "../../../marketplace-authorization";
import { PartnerHuntWorkspace } from "./PartnerHuntWorkspace";
export const dynamic="force-dynamic"; export const metadata={title:"Partner Hunt",robots:{index:false,follow:false}};
export default async function PartnerHuntPage(){await requireMarketplaceAdministrator("/admin/marketplace/partners");return <main className="partner-hunt"><header><p>Founder-only · local in-memory workflow</p><h1>Partner Hunt</h1><p>Customer value first. Commercial opportunity second. Evidence before verification.</p></header><PartnerHuntWorkspace/></main>}
