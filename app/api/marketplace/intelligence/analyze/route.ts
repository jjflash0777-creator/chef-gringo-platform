import { authorizeMarketplaceRequest, marketplaceAuthorizationResponse } from "../../../../lib/marketplace-permissions.ts";
import { validateDecisionCaseInput } from "../../../../marketplace/intelligence/case-input-validation.ts";
import { evaluateDecisionCase } from "../../../../marketplace/intelligence/decision-case-service.ts";

export async function POST(request: Request) {
  if (!authorizeMarketplaceRequest(request)) return marketplaceAuthorizationResponse(request);
  let input: unknown;
  try { input = await request.json(); }
  catch { return Response.json({ ok: false, error: "The request could not be read. Please try again." }, { status: 400 }); }
  const validation = validateDecisionCaseInput(input);
  if (!validation.ok) return Response.json(validation, { status: 400 });
  try { return Response.json({ ok: true, result: evaluateDecisionCase(validation.value) }); }
  catch { return Response.json({ ok: false, error: "Chef Gringo could not complete this analysis. Your information was not saved." }, { status: 500 }); }
}
