import {applyVerificationReceipt,verifySignedBody,type VerificationReceipt} from "../../../../../db/growth-os-dispatcher.ts";
import {growthDb,growthError} from "../../_shared.ts";

export const dynamic="force-dynamic";

type RuntimeEnv={GROWTH_DISPATCH_SECRET?:string};
function secret(){const runtime=(globalThis as typeof globalThis&{__CHEF_GRINGO_ENV__?:RuntimeEnv}).__CHEF_GRINGO_ENV__;return runtime?.GROWTH_DISPATCH_SECRET??process.env.GROWTH_DISPATCH_SECRET??"";}

export async function POST(request:Request){try{const signingSecret=secret();if(!signingSecret)return Response.json({error:"Verification callback is not configured."},{status:503});const signature=request.headers.get("x-chef-gringo-signature")??"";const body=await request.text();if(!await verifySignedBody(body,signature,signingSecret))return Response.json({error:"Invalid verification signature."},{status:401});let receipt:VerificationReceipt;try{receipt=JSON.parse(body) as VerificationReceipt}catch{return Response.json({error:"Verification payload must be valid JSON."},{status:400})}if(!receipt||typeof receipt.outboxId!=="string"||typeof receipt.leaseToken!=="string"||!["published","verified","failed","ambiguous"].includes(receipt.status))return Response.json({error:"Verification payload is incomplete."},{status:400});const entry=await applyVerificationReceipt(growthDb(),receipt);return Response.json({entry});}catch(error){return growthError(error)}}
