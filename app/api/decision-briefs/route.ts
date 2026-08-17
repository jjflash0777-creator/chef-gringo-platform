import { createDecisionBriefRequest, DECISION_BRIEF_POLICY_VERSION } from "../../../db/decision-brief-repository.ts";
import { getD1Binding } from "../../../db/index.ts";
import {
  LOOPS_CONTACTS_UPDATE_ENDPOINT,
  LOOPS_EVENTS_SEND_ENDPOINT,
  toLoopsDecisionBriefContact,
  toLoopsDecisionBriefEvent,
} from "../../lib/engagement/loopsAdapter.ts";

const PROVIDER_TIMEOUT_MS = 8000;

function checkoutUrl(base: string, caseId: string, email: string) {
  const url = new URL(base);
  if (url.protocol !== "https:" || url.hostname !== "buy.stripe.com" || !url.pathname.startsWith("/test_")) {
    throw new Error("The decision brief sandbox checkout is not configured safely.");
  }
  url.searchParams.set("client_reference_id", caseId);
  url.searchParams.set("prefilled_email", email);
  return url.toString();
}

async function notifyLoops(input: Parameters<typeof toLoopsDecisionBriefContact>[0]) {
  const token = process.env.EARLY_ACCESS_TOKEN || process.env.EMAIL_SUBSCRIBE_TOKEN;
  if (!token) return;
  const headers = { "content-type": "application/json", authorization: `Bearer ${token}` };
  await Promise.all([
    fetch(LOOPS_CONTACTS_UPDATE_ENDPOINT, { method: "PUT", headers, body: JSON.stringify(toLoopsDecisionBriefContact(input)), signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS) }),
    fetch(LOOPS_EVENTS_SEND_ENDPOINT, { method: "POST", headers, body: JSON.stringify(toLoopsDecisionBriefEvent(input)), signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS) }),
  ]);
}

export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try { payload = await request.json() as Record<string, unknown>; }
  catch { return Response.json({ message: "Submit the form again." }, { status: 400 }); }
  if (payload.companyWebsite) return Response.json({ ok: true });
  const baseCheckoutUrl = process.env.DECISION_BRIEF_CHECKOUT_URL;
  if (!baseCheckoutUrl) return Response.json({ message: "Sandbox checkout is not connected yet." }, { status: 503 });
  try {
    const brief = await createDecisionBriefRequest(getD1Binding(), { ...payload, policyVersion: DECISION_BRIEF_POLICY_VERSION });
    const loopsInput = { email: brief.email, firstName: brief.firstName, caseId: brief.id, equipmentType: brief.equipmentType, urgency: brief.urgency, marketingConsent: brief.marketingConsent };
    void notifyLoops(loopsInput).catch(() => undefined);
    return Response.json({ ok: true, caseId: brief.id, checkoutUrl: checkoutUrl(baseCheckoutUrl, brief.id, brief.email) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The request could not be saved.";
    const unavailable = /binding.*unavailable/i.test(message);
    return Response.json({ message: unavailable ? "Decision brief storage is not configured." : message }, { status: unavailable ? 503 : 400 });
  }
}
