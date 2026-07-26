export async function POST(request: Request) {
  const { email, source } = await request.json() as { email?: string; source?: string };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ message: "Enter a valid email address." }, { status: 400 });
  }
  const endpoint = process.env.EMAIL_SUBSCRIBE_ENDPOINT;
  if (!endpoint) {
    return Response.json(
      { message: "Email signup is not connected yet. Please check back soon." },
      { status: 503 },
    );
  }
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.EMAIL_SUBSCRIBE_TOKEN ? { authorization: `Bearer ${process.env.EMAIL_SUBSCRIBE_TOKEN}` } : {}),
      },
      body: JSON.stringify({ email, source }),
    });
    if (!response.ok) throw new Error("Provider rejected signup");
    return Response.json({ ok: true });
  } catch {
    return Response.json({ message: "We couldn’t complete signup. Please try again later." }, { status: 502 });
  }
}
