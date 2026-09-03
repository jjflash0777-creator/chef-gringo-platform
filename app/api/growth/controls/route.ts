import {getGrowthControls,setGrowthControl,type GrowthControlScope} from "../../../../db/growth-os-repository.ts";
import {growthDb,growthError,requireGrowthAdministrator} from "../_shared.ts";

export const dynamic="force-dynamic";

export async function GET(request:Request){const {response}=requireGrowthAdministrator(request);if(response)return response;try{return Response.json({controls:await getGrowthControls(growthDb()),phase:"phase_1",paidPublishingHardDisabled:true})}catch(error){return growthError(error)}}

export async function POST(request:Request){const {administrator,response}=requireGrowthAdministrator(request);if(response||!administrator)return response;try{const body=await request.json() as Record<string,unknown>;if(typeof body.enabled!=="boolean")return Response.json({error:"enabled must be boolean."},{status:400});if(typeof body.reason!=="string"||!body.reason.trim())return Response.json({error:"A control change reason is required."},{status:400});const control=await setGrowthControl(growthDb(),{scope:String(body.scope??"") as GrowthControlScope,enabled:body.enabled,reason:body.reason,actorEmail:administrator.email});return Response.json({control,paidPublishingHardDisabled:true})}catch(error){return growthError(error)}}
