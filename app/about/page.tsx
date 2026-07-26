import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Founder Story", description: "The hospitality experience and purpose behind Chef Gringo." };

export default function AboutPage() {
  return <div className="page-shell container narrow">
    <p className="breadcrumbs"><Link href="/">Home</Link> / Founder Story</p>
    <p className="eyebrow">Built from the floor up</p>
    <h1>No one should have to decode hospitality alone.</h1>
    <div className="prose">
      <p className="lede">Chef Gringo is being built from a career that started bussing tables and grew through nearly every level of front- and back-of-house hospitality.</p>
      <h2>Experience across the operation</h2>
      <p>The founder’s experience includes corporate restaurants, independent operations, fine dining, catering, coffee and espresso, meal preparation, personalized culinary services, senior living, budgeting, staffing, training, food safety, and culinary leadership.</p>
      <p>That range matters because hospitality problems rarely stay in one department. A menu decision affects purchasing. A training gap affects service. A scheduling decision affects retention. A great guest experience depends on dozens of people and systems working together.</p>
      <h2>Why Chef Gringo</h2>
      <p>Hospitality is full of generous mentors, but access to good guidance is uneven. Many people learn through avoidable mistakes, scattered advice, and workplaces that never explain the bigger picture.</p>
      <blockquote>“I built Chef Gringo so others would not have to figure out the hospitality industry alone.”</blockquote>
      <p>The goal is not to replace experience. It is to help people make more sense of it—so they can learn faster, lead with more confidence, and build operations worthy of the people inside them.</p>
      <Link className="button" href="/early-access">Join Early Access</Link>
    </div>
  </div>;
}
