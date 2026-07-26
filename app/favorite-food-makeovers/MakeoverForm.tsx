"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { trackEvent } from "../components/AnalyticsBridge";

const goals = ["Lower sodium", "Lower saturated fat", "Higher protein", "Lower added sugar", "Easy to chew", "Smaller appetite", "No specific dietary goal"];

export function MakeoverForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Record<string, string> | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>;
    const nextErrors: Record<string, string> = {};
    for (const field of ["food", "person", "goal", "texture", "time"]) if (!data[field]?.trim()) nextErrors[field] = "Please complete this field.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setResult(data);
    trackEvent("makeover_form_completed", { food: data.food, goal: data.goal });
  }

  const isBigMac = result && /(big\s*mac|burger)/i.test(result.food);
  return (
    <>
      <form className="makeover-form" onSubmit={submit} onFocus={() => trackEvent("makeover_form_started")}>
        <Field label="Favorite food" name="food" placeholder="Example: Big Mac or meatloaf" error={errors.food} />
        <Field label="Person being cooked for" name="person" placeholder="Example: My dad" error={errors.person} />
        <label>Dietary goal<select name="goal" defaultValue=""><option value="" disabled>Choose one</option>{goals.map((goal) => <option key={goal}>{goal}</option>)}</select><Error text={errors.goal} /></label>
        <label>Chewing or texture concern<select name="texture" defaultValue=""><option value="" disabled>Choose one</option><option>No concern</option><option>Needs to be easier to chew</option><option>Prefers softer foods</option><option>Clinician-provided texture instructions</option></select><Error text={errors.texture} /></label>
        <Field label="Ingredients they dislike" name="dislikes" placeholder="Optional: mushrooms, mayo…" error={errors.dislikes} />
        <label>Cooking time available<select name="time" defaultValue=""><option value="" disabled>Choose one</option><option>15 minutes</option><option>30 minutes</option><option>45–60 minutes</option><option>Weekend project</option></select><Error text={errors.time} /></label>
        <button className="button wide-button">Build my makeover preview</button>
      </form>
      {result && (
        <section className="result-card" aria-live="polite">
          <p className="eyebrow">Your structured preview</p>
          <h2>{isBigMac ? "Good news: this makeover is ready." : `${result.food} is in the makeover queue.`}</h2>
          <dl>
            <div><dt>Cooking for</dt><dd>{result.person}</dd></div>
            <div><dt>Goal</dt><dd>{result.goal}</dd></div>
            <div><dt>Texture</dt><dd>{result.texture}</dd></div>
            <div><dt>Time</dt><dd>{result.time}</dd></div>
            {result.dislikes && <div><dt>Avoid</dt><dd>{result.dislikes}</dd></div>}
          </dl>
          {isBigMac ? (
            <Link className="button" href="/favorite-food-makeovers/big-mac-style-burger">See the Big Mac–style makeover</Link>
          ) : (
            <>
              <p>We do not have a verified recipe for this food yet. Join the list and we’ll let you know when a thoughtfully tested version is ready.</p>
              <Link className="button secondary" href="/newsletter">Get makeover updates</Link>
            </>
          )}
        </section>
      )}
    </>
  );
}

function Field({ label, name, placeholder, error }: { label: string; name: string; placeholder: string; error?: string }) {
  return <label>{label}<input name={name} placeholder={placeholder} aria-invalid={!!error} aria-describedby={error ? `${name}-error` : undefined} /><Error text={error} id={`${name}-error`} /></label>;
}
function Error({ text, id }: { text?: string; id?: string }) { return text ? <span className="field-error" id={id}>{text}</span> : null; }
