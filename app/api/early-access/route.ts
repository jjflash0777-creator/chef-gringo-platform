import {
  isAllowedEarlyAccessEndpoint,
  LOOPS_PROVIDER_METHOD,
  toLoopsContact,
} from "../../lib/engagement/loopsAdapter.ts";
import { POLICY_VERSION, validateWaitlist } from "../../lib/waitlist.mjs";

const PROVIDER_TIMEOUT_MS = 8000;

type WaitlistPayload = {
  firstName?: string;
  email?: string;
  role?: string;
  interest?: string;
  consentMarketing?: string | boolean;
  companyWebsite?: string;
};

export async function POST(request: Request) {
  let payload: WaitlistPayload;
  try {
    payload = await request.json() as WaitlistPayload;
  } catch {
    return Response.json({ message: "Submit the form again." }, { status: 400 });
  }
  if (payload.companyWebsite) return Response.json({ ok: true });
  const errors = validateWaitlist(payload);
  if (Object.keys(errors).length) return Response.json({ message: "Complete all required fields.", errors }, { status: 400 });

  const endpoint = process.env.EARLY_ACCESS_ENDPOINT || process.env.EMAIL_SUBSCRIBE_ENDPOINT;
  if (!endpoint) {
    return Response.json({ message: "Early access signup is not connected yet. Please check back soon." }, { status: 503 });
  }
  if (!isAllowedEarlyAccessEndpoint(endpoint)) {
    return Response.json({ message: "We couldn’t complete signup. Please try again later." }, { status: 502 });
  }

  const token = process.env.EARLY_ACCESS_TOKEN || process.env.EMAIL_SUBSCRIBE_TOKEN;
  const loopsPayload = toLoopsContact({
    firstName: String(payload.firstName),
    email: String(payload.email),
    role: String(payload.role),
    interest: String(payload.interest),
    policyVersion: POLICY_VERSION,
  });

  try {
    const response = await fetch(endpoint, {
      method: LOOPS_PROVIDER_METHOD,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(loopsPayload),
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error("Provider rejected signup");
    return Response.json({ ok: true });
  } catch {
    return Response.json({ message: "We couldn’t complete signup. Please try again later." }, { status: 502 });
  }
}
