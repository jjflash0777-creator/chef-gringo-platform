"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { trackCommercialEvent, trackEvent } from "./AnalyticsBridge";
import { interestOptions, POLICY_VERSION, validateWaitlist } from "../lib/waitlist.mjs";

type Status = "idle" | "sending" | "success" | "error";

export function WaitlistForm({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [started, setStarted] = useState(false);

  function begin() {
    if (!started) {
      setStarted(true);
      trackEvent("waitlist_started");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const nextErrors = validateWaitlist(values) as unknown as Record<string, string>;
    setErrors(nextErrors);
    setMessage("");
    if (Object.keys(nextErrors).length) {
      setStatus("error");
      setMessage("Review the highlighted fields and try again.");
      trackEvent("waitlist_failed", { reason: "validation" });
      return;
    }
    setStatus("sending");
    try {
      const response = await fetch("/api/early-access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await response.json() as { message?: string };
      if (!response.ok) throw new Error(body.message || "Early access signup is unavailable right now.");
      setStatus("success");
      setMessage("You’re on the early-access list. We’ll keep the emails useful.");
      trackEvent("early_access_submitted", { interest: values.interest, policyVersion: POLICY_VERSION });
      trackCommercialEvent("email_signup", { source: "early-access", interest: values.interest });
      form.reset();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Early access signup is unavailable right now.");
      trackEvent("waitlist_failed", { reason: "provider" });
    }
  }

  return (
    <form className={`waitlist-form ${compact ? "compact" : ""}`} onSubmit={submit} onFocus={begin} noValidate>
      <div className="form-grid">
        <Field label="First name" name="firstName" autoComplete="given-name" error={errors.firstName} />
        <Field label="Email address" name="email" type="email" autoComplete="email" error={errors.email} />
        <Field label="Current hospitality role or interest" name="role" placeholder="Example: line cook, student, café owner" error={errors.role} />
        <label htmlFor="interest">Primary interest area
          <select id="interest" name="interest" defaultValue="" aria-invalid={!!errors.interest} aria-describedby={errors.interest ? "interest-error" : undefined}>
            <option value="" disabled>Choose one</option>
            {interestOptions.map((interest: string) => <option key={interest}>{interest}</option>)}
          </select>
          {errors.interest && <span className="field-error" id="interest-error">{errors.interest}</span>}
        </label>
      </div>
      <label className="consent-field" htmlFor="consentMarketing">
        <input
          id="consentMarketing"
          name="consentMarketing"
          type="checkbox"
          value="true"
          aria-invalid={!!errors.consentMarketing}
          aria-describedby={errors.consentMarketing ? "consentMarketing-error" : undefined}
        />
        <span>
          I agree to receive early-access updates from Chef Gringo. Read our{" "}
          <Link href="/privacy">privacy notice</Link> (policy version {POLICY_VERSION}).
        </span>
      </label>
      {errors.consentMarketing && <span className="field-error" id="consentMarketing-error">{errors.consentMarketing}</span>}
      <div className="honeypot" aria-hidden="true"><label>Leave this blank<input name="companyWebsite" tabIndex={-1} autoComplete="off" /></label></div>
      <button className="button wide-button" disabled={status === "sending"}>{status === "sending" ? "Joining…" : "Join Early Access"}</button>
      <p className="privacy-note">We collect only what helps shape the platform. No sold lists, fake urgency, or surprise promotions.</p>
      <p className={`form-message ${status}`} role="status" aria-live="polite">{message}</p>
    </form>
  );
}

function Field({ label, name, type = "text", placeholder, autoComplete, error }: { label: string; name: string; type?: string; placeholder?: string; autoComplete?: string; error?: string }) {
  const errorId = `${name}-error`;
  return <label htmlFor={name}>{label}<input id={name} name={name} type={type} placeholder={placeholder} autoComplete={autoComplete} aria-invalid={!!error} aria-describedby={error ? errorId : undefined} />{error && <span className="field-error" id={errorId}>{error}</span>}</label>;
}
