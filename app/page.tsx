"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { trackEvent } from "./components/AnalyticsBridge";
import { OperatorToolDock } from "./components/OperatorToolDock";

const doors = [
  ["Something broke", "Repair → parts → replacement → used → direct", "repair"],
  ["I'm spending too much", "Suppliers → software → fees → operating costs", "costs"],
  ["I'm opening a business", "Payments → equipment → suppliers → compliance", "opening"],
  ["I need something", "Research → compare → source → buy", "buy"],
  ["Lower my operating costs", "Food → labor → utilities → waste → purchasing", "savings"],
  ["Show me opportunities", "Better routes → underdog brands → direct sourcing", "opportunity"],
] as const;

function followUp(value: string) {
  if (/broken|repair|fix|stopped/i.test(value)) return "What equipment is it, and what happens when you try to use it?";
  if (/buy|need|replace|opening/i.test(value)) return "What outcome, capacity, destination, budget, and timing matter most?";
  if (/cost|expensive|spending|save/i.test(value)) return "Which recurring cost or recent invoice should we examine first?";
  return "What are you trying to buy, fix, replace, improve, or understand?";
}

export default function Home() {
  const [request,setRequest]=useState(""); const [response,setResponse]=useState("");
  useEffect(() => trackEvent("landing_page_viewed"), []);
  function ask(event:FormEvent){event.preventDefault();setResponse(request.trim()?followUp(request):"Start with a few words about what is costing you money.");}
  return <>
    <section className="experience-hero"><div className="container experience-hero-inner"><p className="experience-kicker">Operator purchasing · savings · sourcing · decision intelligence</p><h1>What&apos;s costing<br/>you money?</h1><p className="experience-lede">Tell Chef Gringo what you&apos;re trying to buy, fix, replace, improve, or understand.</p>
      <form className="operator-ask" onSubmit={ask} aria-label="Ask Chef Gringo"><label htmlFor="operator-question">Describe the problem</label><textarea id="operator-question" rows={3} value={request} onChange={event=>setRequest(event.target.value)} placeholder="My walk-in is failing… Our POS fees feel too high… I need a mixer…"/><div className="ask-modes" aria-label="Ways to ask"><button type="button" disabled>Photo <small>Coming next</small></button><button type="button" disabled>Voice <small>Coming next</small></button><span aria-current="true">Describe it <small>Ready</small></span></div><button className="experience-cta" type="submit">Ask Chef Gringo <span aria-hidden="true">→</span></button>{response&&<p className="operator-response" role="status"><strong>Next useful question:</strong> {response}</p>}</form>
      <p className="hero-proof">No pay-to-rank · Unknowns stay unknown · Commercial relationships disclosed</p></div></section>

    <section className="entry-section container"><p className="experience-kicker dark">Six ways in</p><h2>I didn&apos;t realize Chef Gringo could do that.</h2><div className="entry-doors">{doors.map(([title,copy,tone])=><Link href={title==="I need something"?"/marketplace":"/marketplace#problems"} className={`entry-door ${tone}`} key={title}><span>{title}</span><p>{copy}</p><strong aria-hidden="true">↗</strong></Link>)}</div></section>

    <section className="revelation-band"><div className="container revelation-grid"><article><p>Behind the price</p><h2>Sticker price is not customer cost.</h2><p>Freight, duty, brokerage, tax, delivery, adaptation, compliance, warranty, and parts can change the decision.</p></article><article className="cost-demo" aria-label="Synthetic price intelligence demonstration"><span>Demo data · synthetic</span>{[["Domestic","Observed"],["Used / refurbished","Unknown"],["Factory direct","Unknown"],["Repair","Unknown"],["Upgrade","Unknown"]].map(([route,state])=><div key={route}><strong>{route}</strong><em className={state.toLowerCase()}>{state}</em></div>)}<p>Potential opportunity — verification required.</p></article></div></section>

    <section className="watch-section container"><div className="industrial-window" aria-hidden="true"><span>CG</span><i></i><i></i><i></i></div><div><p className="experience-kicker dark">Chef Gringo never clocks out</p><h2>Built to keep watching.</h2><p>The system is being designed to monitor price changes, manufacturers, software programs, used inventory, parts, warranties, and better alternatives. No fake activity feed. No imaginary counters.</p><details><summary>What this capability will watch</summary><p>Verified price movement, product and specification changes, new sourcing routes, partner programs, warranty terms, replacement parts, and recommendation challenges.</p></details></div></section>

    <section className="software-band"><div className="container software-inner"><p className="experience-kicker">Beyond equipment</p><h2>Equipment is only one place businesses overpay.</h2><div className="service-ribbon">{["POS","Payments","Scheduling","Payroll","Inventory","Food costing","Accounting","Ordering","Reservations","Training","Financing","Insurance"].map(item=><span key={item}>{item}</span>)}</div><p>Software &amp; Services intelligence is coming in a separate sprint. No partnerships or payouts are implied.</p></div></section>

    <section className="independent-section container"><p className="experience-kicker dark">Underdog discovery</p><h2>The best product doesn&apos;t always have the biggest marketing budget.</h2><p>Chef Gringo is built to compare dominant brands, independent makers, repair routes, used equipment, and direct sourcing on evidence and operator value.</p><div className="trust-statement"><strong>Chef Gringo does not sell rankings.</strong><span>Recommendations must be earned. Commercial relationships remain separate.</span></div></section>

    <section className="trust-rail"><div className="container"><p className="experience-kicker">The operator promise</p><h2>We compare. We verify. We show unknowns.</h2><ol><li><span>01</span>We disclose commercial relationships.</li><li><span>02</span>We separate economics from editorial judgment.</li><li><span>03</span>We change recommendations when better evidence appears.</li></ol></div></section>

    <section className="final-ask"><div className="container"><span className="compact-cg" aria-hidden="true">CG</span><h2>Bring me the problem.</h2><p>I&apos;ll help you find the smartest next move.</p><a className="experience-cta" href="#operator-question">Ask Chef Gringo →</a></div></section>
    <OperatorToolDock />
  </>;
}
