import type { Metadata } from "next";
export const metadata: Metadata = { title: "About", description: "Why Chef Gringo combines favorite-food makeovers with practical senior-living culinary tools." };
export default function AboutPage() { return <div className="page-shell container narrow">
  <p className="breadcrumbs"><a href="/">Home</a> / About</p><p className="eyebrow">Why Chef Gringo exists</p><h1>Food changes. Dignity and enjoyment should not.</h1>
  <div className="prose"><p>Chef Gringo grew from real senior-living culinary leadership and foodservice operations. In that world, a recipe has to do more than sound good: it has to work for the person eating it and the kitchen producing it.</p>
  <h2>For families and caregivers</h2><p>We begin with favorite foods, daily routines, and practical goals. A thoughtful adaptation should still feel familiar—not like a punishment wearing a garnish.</p>
  <h2>For culinary professionals</h2><p>We build straightforward tools for recipe scaling, production, sanitation, cost control, staffing, and resident dining. No invented credentials, miracle claims, or dashboard theater.</p>
  <h2>Our boundary</h2><p>Chef Gringo is a culinary education platform, not a healthcare provider. We support good questions and useful cooking—not diagnosis or individualized medical advice.</p></div>
</div>; }
