import {createOutboxEntry,listOutbox,type OutboxState} from "../../../../db/growth-os-repository.ts";
import {growthDb,growthError,requireGrowthAdministrator} from "../_shared.ts";

export const dynamic="force-dynamic";

export async function GET(request:Request){const {response}=requireGrowthAdministrator(request);if(response)return response;try{const state=new URL(request.url).searchParams.get("state")||undefined;return Response.json({outbox:await listOutbox(growthDb(),state as OutboxState|undefined),dispatcherConnected:false,paidPublishingEnabled:false})}catch(error){return growthError(error)}}

export async function POST(request:Request){const {administrator,response}=requireGrowthAdministrator(request);if(response||!administrator)return response;try{const body=await request.json() as Record<string,unknown>;const entry=await createOutboxEntry(growthDb(),{packageId:String(body.packageId??""),variantId:String(body.variantId??""),destinationUrlId:String(body.destinationUrlId??""),channel:String(body.channel??""),targetAccount:String(body.targetAccount??""),trackedHref:String(body.trackedHref??""),createdBy:administrator.email,scheduledAt:typeof body.scheduledAt==="string"?body.scheduledAt:null,publicationKind:body.publicationKind==="paid"?"paid":"organic"});return Response.json({entry,dispatcherConnected:false,paidPublishingEnabled:false},{status:201})}catch(error){return growthError(error)}}
