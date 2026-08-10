"use client";

import Link from "next/link";
import { useEffect } from "react";
import { trackEvent } from "./components/AnalyticsBridge";
import { HomepageIntake } from "./components/HomepageIntake";

const doors = [
  ["Something broke?", "Let's see whether fixing it makes more sense than replacing it.", "repair"],
  ["Think you're paying too much?", "Show Chef Gringo what you're paying.", "costs"],
  ["Starting something new?", "Build the stack without wasting the opening budget.", "opening"],
  ["Looking for something?", "Let's figure out what actually makes sense.", "buy"],
  ["Want to cut some costs?", "Let's look at where the money is going.", "savings"],
  ["Need more customers?", "Let's figure out how to bring them through the door.", "opportunity"],
] as const;

export default function Home() {
  useEffect(() => trackEvent("landing_page_viewed"), []);
  return <>
    <section className="cg-home-hero"><div className="cg-width-wide cg-home-hero-inner"><div className="cg-home-context"><p className="cg-type-operational">The Working Pass</p><span>Hospitality intelligence for the work in front of you</span></div><h1 className="cg-type-display">What are you working on?</h1><HomepageIntake /><p className="cg-home-trust">Recommendations are based on operator value—not commission.</p></div></section>

    <section className="entry-section container"><p className="experience-kicker dark">Two sides of the business</p><h2>Operate smarter. Grow the business.</h2><div className="entry-doors">{doors.map(([title,copy,tone])=><Link href={tone==="buy"?"/marketplace":"/marketplace#problems"} className={`entry-door ${tone}`} key={title}><span>{title}</span><p>{copy}</p><strong aria-hidden="true">↗</strong></Link>)}</div></section>

    <section className="revelation-band"><div className="container revelation-grid"><article><p>Behind the price</p><h2>Sticker price is not customer cost.</h2><p>Freight, duty, brokerage, tax, delivery, adaptation, compliance, warranty, and parts can change the decision.</p></article><article className="cost-demo" aria-label="Synthetic price intelligence demonstration"><span>Demo data · synthetic</span>{[["Domestic","Observed"],["Used / refurbished","Unknown"],["Factory direct","Unknown"],["Repair","Unknown"],["Upgrade","Unknown"]].map(([route,state])=><div key={route}><strong>{route}</strong><em className={state.toLowerCase()}>{state}</em></div>)}<p>Potential opportunity — verification required.</p></article></div></section>

    <section className="watch-section container"><div className="industrial-window" aria-hidden="true"><span>CG</span><i></i><i></i><i></i></div><div><p className="experience-kicker dark">Chef Gringo never clocks out</p><h2>Built to keep watching.</h2><p>The system is being designed to monitor price changes, manufacturers, software programs, used inventory, parts, warranties, and better alternatives. No fake activity feed. No imaginary counters.</p><details><summary>What this capability will watch</summary><p>Verified price movement, product and specification changes, new sourcing routes, partner programs, warranty terms, replacement parts, and recommendation challenges.</p></details></div></section>

    <section className="growth-band" id="grow"><div className="container growth-split"><div><p className="experience-kicker">Grow the business · Upcoming</p><h2>Need more customers?</h2><p>Tell Chef Gringo what&apos;s slow, what you&apos;re selling, and who you&apos;re trying to reach. The future system will help shape the offer, audience, campaign, and measurement—without pretending clicks equal profit.</p></div><div className="growth-loop" aria-label="Future customer acquisition loop">{["Find demand","Build the offer","Reach buyers","Measure leads","Measure revenue","Improve value"].map((step,index)=><span key={step}><b>0{index+1}</b>{step}</span>)}</div></div></section>
    <section className="software-band"><div className="container software-inner"><p className="experience-kicker">Operate smarter</p><h2>Equipment is only one place businesses overpay.</h2><div className="statement-shell"><strong>Show me what you&apos;re paying.</strong><p>Merchant statement, POS invoice, software invoice, or contract analysis is upcoming. No document parsing is active.</p></div><div className="service-ribbon">{["POS","Payments","Scheduling","Payroll","Inventory","Food costing","Accounting","Ordering","Reservations","Training","Financing","Insurance"].map(item=><span key={item}>{item}</span>)}</div><p>Software &amp; Services intelligence is upcoming. No partnerships or payouts are implied.</p></div></section>

    <section className="independent-section container"><p className="experience-kicker dark">Underdog discovery</p><h2>The best product doesn&apos;t always have the biggest marketing budget.</h2><p>Chef Gringo is built to compare dominant brands, independent makers, repair routes, used equipment, and direct sourcing on evidence and operator value.</p><div className="trust-statement"><strong>Chef Gringo does not sell rankings.</strong><span>Recommendations must be earned. Commercial relationships remain separate.</span></div></section>

    <section className="trust-rail"><div className="container"><p className="experience-kicker">The operator promise</p><h2>We compare. We verify. We show unknowns.</h2><ol><li><span>01</span>We disclose commercial relationships.</li><li><span>02</span>We separate economics from editorial judgment.</li><li><span>03</span>We change recommendations when better evidence appears.</li></ol></div></section>

    <section className="final-ask"><div className="container"><span className="compact-cg" aria-hidden="true">CG</span><h2>Bring me the problem.</h2><p>I&apos;ll help you find the smartest next move.</p><a className="experience-cta" href="#operator-question">Tell Chef Gringo →</a></div></section>
  </>;
}
