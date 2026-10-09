"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import "./solve-v2.css";

const examples = [
  "My walk-in freezer is at 48°F and the fans are running.",
  "Should I repair or replace this oven?",
  "I need a commercial mixer under $6,000.",
  "My ice machine keeps going down.",
  "I have a repair quote and don't know whether it makes sense.",
];

const proof = [
  ["Decision support", "Clear next steps instead of a sales pitch."],
  ["Risk aware", "Know what is safe to check and what belongs to a technician."],
  ["Operator first", "Repair, replace, source, or wait — based on the situation."],
  ["Evidence separated", "What we know, what we infer, and what still needs verification."],
];

export default function SolveV2Page() {
  const [problem, setProblem] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = problem.trim();
    if (!trimmed) return;
    window.location.href = `/start?problem=${encodeURIComponent(trimmed)}`;
  }

  return (
    <div className="solveV2">
      <section className="solveV2Hero">
        <div className="solveV2HeroCopy">
          <p className="solveV2Eyebrow">CHEF GRINGO / COMMERCIAL KITCHEN INTELLIGENCE</p>
          <h1>Kitchen problems have solutions.</h1>
          <p className="solveV2Lead">
            Tell Chef Gringo what is happening. Get a practical read on what is likely, what is risky,
            what you can safely check, and whether the smarter move is repair, replacement, sourcing,
            or a second opinion.
          </p>
          <div className="solveV2TrustLine" aria-label="Product trust points">
            <span>No signup</span><span>No credit card</span><span>No sales pitch</span>
          </div>
        </div>
        <div className="solveV2Visual" aria-hidden="true">
          <div className="solveV2Glow" />
          <div className="solveV2Machine">
            <div className="solveV2MachineTop" />
            <div className="solveV2MachineDoor"><span>38°</span></div>
            <div className="solveV2MachineVent" />
          </div>
          <div className="solveV2StatCard solveV2StatOne"><strong>48°F</strong><span>walk-in temp</span></div>
          <div className="solveV2StatCard solveV2StatTwo"><strong>3</strong><span>safe checks first</span></div>
        </div>
      </section>

      <section className="solveV2Intake" aria-labelledby="solve-heading">
        <div className="solveV2IntakeHead">
          <div>
            <p className="solveV2Eyebrow">START HERE</p>
            <h2 id="solve-heading">What are you dealing with?</h2>
          </div>
          <p>Plain words are fine. Numbers, model numbers, symptoms, quotes, and photos help.</p>
        </div>

        <form onSubmit={submit} className="solveV2Form">
          <textarea
            value={problem}
            onChange={(event) => setProblem(event.target.value)}
            placeholder="Example: The walk-in is reading 48°F, fans are running, condenser is quiet, and I need to know what is safe to check before I call service."
            aria-label="Describe your kitchen problem"
          />
          <div className="solveV2FormBar">
            <span>{problem.trim() ? "Ready to work it out." : "Describe the problem in your own words."}</span>
            <button type="submit" disabled={!problem.trim()}>Work it out <span aria-hidden="true">→</span></button>
          </div>
        </form>

        <div className="solveV2Examples" aria-label="Example problems">
          {examples.map((example, index) => (
            <button key={example} type="button" onClick={() => setProblem(example)}>
              <span>{String(index + 1).padStart(2, "0")}</span>{example}
            </button>
          ))}
        </div>
      </section>

      <section className="solveV2Proof" aria-label="Why Chef Gringo">
        {proof.map(([title, body]) => (
          <article key={title}>
            <div className="solveV2ProofIcon" aria-hidden="true">+</div>
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </section>

      <section className="solveV2How">
        <div className="solveV2HowTitle">
          <p className="solveV2Eyebrow">HOW IT WORKS</p>
          <h2>One problem. One decision path.</h2>
        </div>
        <div className="solveV2Steps">
          <article><span>01</span><h3>Describe</h3><p>Tell us what you see, hear, smell, measured, or were quoted.</p></article>
          <article><span>02</span><h3>Separate signal from noise</h3><p>We organize symptoms, evidence, safety limits, and missing information.</p></article>
          <article><span>03</span><h3>Make the call</h3><p>You get the practical next move and stay in control of the decision.</p></article>
        </div>
      </section>

      <section className="solveV2BottomCta">
        <div>
          <p className="solveV2Eyebrow">NO THEATER. JUST USEFUL WORK.</p>
          <h2>Start with the problem in front of you.</h2>
        </div>
        <Link href="#solve-heading">Start a problem <span aria-hidden="true">→</span></Link>
      </section>
    </div>
  );
}
