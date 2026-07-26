import type { Metadata } from "next";
export const metadata: Metadata = { title: "Medical & Nutrition Disclaimer", description: "Important limits and safety information for Chef Gringo educational cooking content." };
export default function DisclaimerPage() { return <div className="page-shell container narrow">
  <p className="breadcrumbs"><a href="/">Home</a> / Medical & Nutrition Disclaimer</p><p className="eyebrow">Please read before cooking</p><h1>Medical & nutrition disclaimer</h1>
  <div className="prose">
    <p><strong>Chef Gringo provides general educational cooking information.</strong> Content does not diagnose, treat, cure, or prevent disease and is not a substitute for individualized medical, nutrition, or swallowing advice.</p>
    <h2>Individual needs differ</h2><p>Follow instructions from your physician, registered dietitian, speech-language pathologist, pharmacist, or other qualified clinician. A recipe described as heart-conscious, lower in a commonly problematic ingredient, soft, or easier to chew may still be unsuitable for a particular person.</p>
    <h2>Dysphagia and texture-modified foods</h2><p>Swallowing concerns require individualized evaluation. Chef Gringo does not label recipes with IDDSI levels unless documented testing guidance and appropriate review are available. No recipe is “safe for everyone.”</p>
    <h2>Allergens and interactions</h2><p>You are responsible for checking ingredients, labels, cross-contact risks, allergens, and medication-food interactions. Formulations can change; verify current packaging and professional instructions.</p>
    <h2>Nutrition information</h2><p>We do not publish invented nutrition numbers. When verified calculation from a credible source is unavailable, nutrition information is clearly marked as pending.</p>
    <h2>Food safety</h2><p>Use appropriate hygiene, storage, reheating, and safe internal temperatures for the ingredients you select. When in doubt, consult current authoritative food-safety guidance.</p>
  </div>
</div>; }
