import {
  isAllowedEarlyAccessEndpoint,
  LOOPS_EVENTS_SEND_ENDPOINT,
  LOOPS_PROVIDER_METHOD,
  toLoopsNewsletterContact,
  toLoopsNewsletterSignupEvent,
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
  const newsletterInput = {
    email: String(payload.email),
    source: payload.source || "newsletter",
    policyVersion: POLICY_VERSION,
  };
  const loopsPayload = toLoopsNewsletterContact(newsletterInput);

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

    let welcomeEventQueued = false;
    if (token && endpoint === "https://app.loops.so/api/v1/contacts/update") {
      try {
        const eventResponse = await fetch(LOOPS_EVENTS_SEND_ENDPOINT, {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(toLoopsNewsletterSignupEvent(newsletterInput)),
          signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
        });
        welcomeEventQueued = eventResponse.ok;
      } catch {
        // The subscriber is already safely captured. A workflow event failure must not create duplicate signup retries.
      }
    }

    return Response.json({ ok: true, welcomeEventQueued });
  } catch {
    return Response.json({ message: "We couldn’t complete signup. Please try again later." }, { status: 502 });
  }
}
