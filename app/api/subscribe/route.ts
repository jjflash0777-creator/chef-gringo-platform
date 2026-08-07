import {
  isAllowedEarlyAccessEndpoint,
  LOOPS_PROVIDER_METHOD,
  toLoopsNewsletterContact,
} from "../../lib/engagement/loopsAdapter.ts";
import { POLICY_VERSION, validateNewsletter } from "../../lib/waitlist.mjs";

const PROVIDER_TIMEOUT_MS = 8000;

type SubscribePayload = {
  email?: string;
  source?: string;
  consentMarketing?: string | boolean;
  companyWebsite?: string;
};

export async function POST(request: Request) {
  let payload: SubscribePayload;
  try {
    payload = await request.json() as SubscribePayload;
  } catch {
    return Response.json({ message: "Enter a valid email address." }, { status: 400 });
  }
  if (payload.companyWebsite) return Response.json({ ok: true });

  const errors = validateNewsletter(payload);
  if (Object.keys(errors).length) {
    return Response.json({ message: "Complete all required fields.", errors }, { status: 400 });
  }

  const endpoint = process.env.EMAIL_SUBSCRIBE_ENDPOINT || process.env.EARLY_ACCESS_ENDPOINT;
  if (!endpoint) {
    return Response.json(
      { message: "Email signup is not connected yet. Please check back soon." },
      { status: 503 },
    );
  }
  if (!isAllowedEarlyAccessEndpoint(endpoint)) {
    return Response.json({ message: "We couldn’t complete signup. Please try again later." }, { status: 502 });
  }

  const token = process.env.EMAIL_SUBSCRIBE_TOKEN || process.env.EARLY_ACCESS_TOKEN;
  const loopsPayload = toLoopsNewsletterContact({
    email: String(payload.email),
    source: payload.source || "newsletter",
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
