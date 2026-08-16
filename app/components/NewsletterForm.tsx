"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { commercialSessionContext, readCommercialProfile, trackCommercialEvent, trackEvent } from "./AnalyticsBridge";
import { POLICY_VERSION, validateNewsletter } from "../lib/waitlist.mjs";

export function NewsletterForm({ source, buttonLabel }: { source: string; buttonLabel: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const nextErrors = validateNewsletter(values) as unknown as Record<string, string>;
    setErrors(nextErrors);
    setMessage("");
    if (Object.keys(nextErrors).length) {
      setStatus("error");
      setMessage("Review the highlighted fields and try again.");
      return;
    }

    setStatus("sending");
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...values, source, commercialProfile: readCommercialProfile(), attribution: commercialSessionContext().attribution }),
      });
      const body = await response.json() as { message?: string };
      if (!response.ok) throw new Error(body.message || "Signup is unavailable right now.");
      setStatus("success");
      setMessage("You’re on the list. We’ll keep the emails useful.");
      trackEvent(source === "professional-starter-pack" ? "professional_starter_pack_submitted" : "newsletter_form_submitted", { source });
      trackCommercialEvent("email_signup", { source });
      form.reset();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Signup is unavailable right now.");
    }
  }

  return (
    <form className="email-form" onSubmit={submit} noValidate>
      <label htmlFor={`email-${source}`}>Email address</label>
      <div>
        <input
          id={`email-${source}`}
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? `email-${source}-error` : undefined}
        />
        <button className="button" disabled={status === "sending"}>{status === "sending" ? "Sending…" : buttonLabel}</button>
      </div>
      {errors.email && <span className="field-error" id={`email-${source}-error`}>{errors.email}</span>}
      <label className="consent-field" htmlFor={`consentMarketing-${source}`}>
        <input
          id={`consentMarketing-${source}`}
          name="consentMarketing"
          type="checkbox"
          value="true"
          aria-invalid={!!errors.consentMarketing}
          aria-describedby={errors.consentMarketing ? `consentMarketing-${source}-error` : undefined}
        />
        <span>
          I agree to receive the requested guide and occasional useful Chef Gringo email updates. Read our{" "}
          <Link href="/privacy">privacy notice</Link> (policy version {POLICY_VERSION}).
        </span>
      </label>
      {errors.consentMarketing && <span className="field-error" id={`consentMarketing-${source}-error`}>{errors.consentMarketing}</span>}
      <div className="honeypot" aria-hidden="true">
        <label>Leave this blank<input name="companyWebsite" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <p className={`form-message ${status}`} role="status" aria-live="polite">{message}</p>
    </form>
  );
}
