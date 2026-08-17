"use client";

import { FormEvent, useState } from "react";

export function DecisionBriefForm() {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    payload.marketingConsent = form.get("marketingConsent") === "on" ? "true" : "false";
    try {
      const response = await fetch("/api/decision-briefs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...payload, marketingConsent: payload.marketingConsent === "true" }) });
      const result = await response.json() as { message?: string; checkoutUrl?: string };
      if (!response.ok || !result.checkoutUrl) throw new Error(result.message || "The request could not be started.");
      window.location.assign(result.checkoutUrl);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Please try again."); setSubmitting(false); }
  }
  return <form className="decision-brief-form" onSubmit={submit}>
    <input name="companyWebsite" tabIndex={-1} autoComplete="off" aria-hidden="true" className="cg-honeypot" />
    <div className="decision-brief-grid">
      <label>First name<input name="firstName" required minLength={2} maxLength={80} autoComplete="given-name" /></label>
      <label>Email<input name="email" type="email" required maxLength={254} autoComplete="email" /></label>
      <label>Business name <span>(optional)</span><input name="businessName" maxLength={160} autoComplete="organization" /></label>
      <label>Phone <span>(optional)</span><input name="phone" type="tel" maxLength={40} autoComplete="tel" /></label>
      <label>Equipment type<input name="equipmentType" required maxLength={160} placeholder="Reach-in cooler, fryer, generator…" /></label>
      <label>Manufacturer <span>(optional)</span><input name="manufacturer" maxLength={120} /></label>
      <label>Model number <span>(optional)</span><input name="modelNumber" maxLength={120} /></label>
      <label>Approximate age <span>(optional)</span><input name="equipmentAge" maxLength={80} /></label>
    </div>
    <label>What is happening?<textarea name="problemSummary" required minLength={20} maxLength={4000} rows={6} placeholder="Describe the symptoms, downtime, and what has already been tried." /></label>
    <label>Evidence available <span>(optional)</span><textarea name="evidenceSummary" maxLength={4000} rows={4} placeholder="Photos, error codes, technician notes, serial plate, or measurements." /></label>
    <label>Existing repair quote <span>(optional)</span><input name="currentQuote" maxLength={500} placeholder="Amount and what the quote includes" /></label>
    <label>Urgency<select name="urgency" defaultValue="planning"><option value="planning">Planning / researching</option><option value="soon">Need a decision soon</option><option value="urgent">Equipment is down now</option></select></label>
    <label className="decision-brief-check"><input name="marketingConsent" type="checkbox" /> Send me useful Chef Gringo equipment and operator updates. Optional; purchasing the brief does not subscribe you.</label>
    <p className="decision-brief-terms">By continuing, you request a written decision-support brief—not a technician diagnosis, repair instruction, safety certification, or guarantee. The two-business-day target begins after sufficient evidence is received.</p>
    <button className="cg-button cg-button-primary" type="submit" disabled={submitting}>{submitting ? "Saving request…" : "Continue to secure $99 test checkout"}</button>
    {message ? <p role="alert">{message}</p> : null}
  </form>;
}
