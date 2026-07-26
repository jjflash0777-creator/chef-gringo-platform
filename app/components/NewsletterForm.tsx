"use client";

import { FormEvent, useState } from "react";
import { trackEvent } from "./AnalyticsBridge";

export function NewsletterForm({ source, buttonLabel }: { source: string; buttonLabel: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");
    const form = event.currentTarget;
    const email = new FormData(form).get("email");
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const body = await response.json() as { message?: string };
      if (!response.ok) throw new Error(body.message || "Signup is unavailable right now.");
      setStatus("success");
      setMessage("You’re on the list. Check your inbox soon.");
      trackEvent(source === "professional-starter-pack" ? "professional_starter_pack_submitted" : "newsletter_form_submitted", { source });
      form.reset();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Signup is unavailable right now.");
    }
  }

  return (
    <form className="email-form" onSubmit={submit}>
      <label htmlFor={`email-${source}`}>Email address</label>
      <div>
        <input id={`email-${source}`} name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
        <button className="button" disabled={status === "sending"}>{status === "sending" ? "Sending…" : buttonLabel}</button>
      </div>
      <p className={`form-message ${status}`} role="status">{message}</p>
    </form>
  );
}
