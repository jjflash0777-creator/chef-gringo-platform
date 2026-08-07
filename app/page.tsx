"use client";

import Link from "next/link";
import { useEffect } from "react";
import { trackEvent } from "./components/AnalyticsBridge";
import { WaitlistForm } from "./components/WaitlistForm";

const actions = [
  ["Learn", "Build durable culinary, service, beverage, coffee, safety, and business skills."],
  ["Work", "Understand roles, workplaces, and the next practical move in your hospitality career."],
  ["Lead", "Run stronger shifts, teams, kitchens, dining rooms, and multi-site operations."],
  ["Build", "Turn operational experience into a food truck, café, catering company, restaurant, or advisory business."],
];

const pathways = [
  ["Culinary", "From knife skills to kitchen leadership."],
  ["Fine Dining", "Service craft, standards, and guest experience."],
  ["Beverage", "Wine, beer, spirits, cocktails, and responsible service."],
  ["Coffee", "Espresso fundamentals through café operations."],
  ["Senior Living", "Resident-centered dining and complex operations."],
  ["Food Trucks", "Mobile concepts, equipment, permits, and execution."],
  ["Entrepreneurship", "From idea and unit economics to opening day."],
  ["Leadership", "People, systems, budgets, training, and culture."],
];

const tools = ["Food-cost calculators", "Beverage-margin tools", "Recipe scaling", "Production planning", "Emergency planning", "Survey readiness", "Equipment guidance", "Career-roadmap tools", "AI operational support"];

export default function Home() {
  useEffect(() => trackEvent("landing_page_viewed"), []);
  return (
    <>
      <section className="launch-hero">
        <div className="container hero-grid">
          <div>
            <p className="eyebrow">Practical culinary knowledge for people doing the work</p>
            <h1>Learn. Solve. Choose. Build.</h1>
            <p className="lede">Chef Gringo helps cooks, caregivers, culinary leaders, and hospitality builders answer kitchen questions, solve operating problems, and choose equipment with evidence—not hype.</p>
            <div className="button-row">
              <Link className="button" href="/discover" data-event="primary_cta_clicked">Learn something</Link>
              <Link className="button secondary" href="/marketplace" data-event="marketplace_cta_clicked">Find equipment</Link>
            </div>
            <p className="hero-note">Research-backed culinary guidance · 30 real products reviewed</p>
          </div>
          <div className="career-map" aria-label="A branching hospitality career map">
            <div className="map-origin"><span>First shift</span><strong>Start here</strong></div>
            <div className="map-branch"><span>Craft</span><strong>Culinary · Service · Beverage</strong></div>
            <div className="map-branch"><span>Leadership</span><strong>Teams · Operations · Strategy</strong></div>
            <div className="map-branch"><span>Ownership</span><strong>Build something of your own</strong></div>
          </div>
        </div>
      </section>

      <section className="section container now-useful-section">
        <div className="section-heading"><p className="eyebrow">Useful right now</p><h2>Build Your Future in Hospitality—with something useful today.</h2><p>Go directly to a working answer, tool, or researched buying workflow.</p></div>
        <div className="action-grid">
          <Link href="/discover"><span>01</span><h3>Learn something</h3><p>Ask a culinary question and follow connected techniques, ingredients, and workflows.</p></Link>
          <Link href="/marketplace#problems"><span>02</span><h3>Solve a kitchen problem</h3><p>Start with the operational need and compare products against the work.</p></Link>
          <Link href="/marketplace"><span>03</span><h3>Find equipment</h3><p>Review 30 evidence-backed recommendations with honest tradeoffs and price context.</p></Link>
          <Link href="/vision"><span>04</span><h3>Build your career</h3><p>Connect craft, leadership, operations, and ownership into a practical next step.</p></Link>
        </div>
        <div className="button-row"><Link className="button" href="/early-access">Join Early Access</Link><Link className="button secondary" href="/vision">Explore the Vision</Link></div>
      </section>

      <section className="section container" id="platform">
        <div className="section-heading"><p className="eyebrow">One industry. Four core actions.</p><h2>Learn. Work. Lead. Build.</h2><p>Chef Gringo connects the skills people need today with the careers and businesses they want tomorrow.</p></div>
        <div className="action-grid">{actions.map(([title, copy], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
      </section>

      <section className="section dark-section">
        <div className="container audience-split">
          <div><p className="eyebrow light">Built for the full journey</p><h2>From your first apron to the keys to the building.</h2></div>
          <div><p>A dishwasher learning the rhythm of a kitchen. A server ready for management. A barista planning a café. A culinary director managing complexity. An operator preparing to expand.</p><p>Different starting points. Different definitions of success. One trusted place to find the next useful step.</p></div>
        </div>
      </section>

      <section className="section container">
        <div className="section-heading"><p className="eyebrow">Hospitality pathways</p><h2>Explore where experience can take you.</h2><p>These pathways preview the future platform. They are not yet complete courses or job boards.</p></div>
        <div className="pathway-grid">{pathways.map(([title, copy]) => <button type="button" className="pathway-card" key={title} onClick={() => trackEvent("pathway_selected", { pathway: title })}><span>Pathway preview</span><h3>{title}</h3><p>{copy}</p></button>)}</div>
      </section>

      <section className="section career-section">
        <div className="container">
          <div className="section-heading"><p className="eyebrow">A career can climb—and branch</p><h2>There is no single correct ladder.</h2></div>
          <ol className="career-ladder">
            {["Dishwasher", "Prep Cook", "Line Cook", "Sous Chef", "Executive Chef", "Culinary Director", "Regional Leader", "Consultant or Owner"].map((role, index) => <li key={role}><span>{index + 1}</span>{role}</li>)}
          </ol>
          <p className="branch-note">Hospitality careers also move sideways: kitchen to purchasing, barista to roaster, server to events, chef to sales, operator to education. Progress means building a path that fits your strengths—not copying somebody else’s résumé.</p>
        </div>
      </section>

      <section className="section container">
        <div className="section-heading"><p className="eyebrow">Run a better operation</p><h2>Use practical systems—not promises.</h2><p>Scale a recipe today, research equipment by workflow, and explore the operating tools growing around Chef Gringo.</p></div>
        <div className="tool-preview-grid">{tools.map((tool) => <article key={tool}><span className="status">In development</span><h3>{tool}</h3></article>)}</div>
      </section>

      <section className="section founder-section" id="founder">
        <div className="container founder-grid">
          <div className="founder-monogram" aria-hidden="true">CG<span>Service is a craft.</span></div>
          <div>
            <p className="eyebrow light">Why this is being built</p>
            <h2>Hospitality should not be an industry you have to decode alone.</h2>
            <p>The founder began bussing tables and progressed through nearly every level of front- and back-of-house hospitality. His experience spans corporate and independent restaurants, fine dining, catering, coffee and espresso, meal preparation, personalized culinary services, senior living, budgeting, staffing, training, food safety, and culinary leadership.</p>
            <blockquote>“I built Chef Gringo so others would not have to figure out the hospitality industry alone.”</blockquote>
            <Link className="text-link light-link" href="/about" data-event="founder_story_viewed">Read the founder story →</Link>
          </div>
        </div>
      </section>

      <section className="section container trust-section">
        <div><p className="eyebrow">The trust commitment</p><h2>Useful first. Honest always.</h2></div>
        <ul><li>Original resources</li><li>Operator-informed guidance</li><li>Honest product recommendations</li><li>No pay-to-win rankings</li><li>Practical value before promotion</li><li>Respect for proprietary knowledge</li></ul>
      </section>

      <section className="section">
        <div className="container signup-panel">
          <div><p className="eyebrow light">Help shape the foundation</p><h2>Join Chef Gringo early access.</h2><p>Tell us where you are in hospitality and what would be most useful next. We will only ask for what helps us build a better platform.</p></div>
          <WaitlistForm compact />
        </div>
      </section>
    </>
  );
}
