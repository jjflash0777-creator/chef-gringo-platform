import type { Metadata } from "next";
import { MakeoverForm } from "./MakeoverForm";

export const metadata: Metadata = {
  title: "Favorite Food Makeovers",
  description: "Request a practical favorite-food makeover based on dietary goals, texture needs, preferences, and time.",
};

export default function MakeoversPage() {
  return (
    <div className="page-shell container narrow">
      <p className="breadcrumbs"><a href="/">Home</a> / Favorite Food Makeovers</p>
      <p className="eyebrow">Make familiar food fit real life</p>
      <h1>What are we making over?</h1>
      <p className="lede">Tell us what matters. We’ll organize a useful starting point without diagnosing, prescribing, or pretending to be your clinician.</p>
      <MakeoverForm />
    </div>
  );
}
