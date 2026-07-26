import { validateWaitlist } from "../../lib/waitlist.mjs";

type WaitlistPayload = {
  firstName?: string;
  email?: string;
  role?: string;
  interest?: string;
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
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.EARLY_ACCESS_TOKEN || process.env.EMAIL_SUBSCRIBE_TOKEN
          ? { authorization: `Bearer ${process.env.EARLY_ACCESS_TOKEN || process.env.EMAIL_SUBSCRIBE_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({
        firstName: payload.firstName?.trim(),
        email: payload.email?.trim().toLowerCase(),
        role: payload.role?.trim(),
        interest: payload.interest,
        source: "chef-gringo-foundation-sprint-01",
      }),
    });
    if (!response.ok) throw new Error("Provider rejected signup");
    return Response.json({ ok: true });
  } catch {
    return Response.json({ message: "We couldn’t complete signup. Please try again later." }, { status: 502 });
  }
}
