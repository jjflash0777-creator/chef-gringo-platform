"use client";

import { useEffect, useState } from "react";
import { HomepageIntake } from "../components/HomepageIntake";
import { DecisionProofPanel } from "../components/DecisionProofPanel";
import { InvestigationCasePanel } from "../components/InvestigationCasePanel";
import { trackCommercialEvent, trackEvent } from "../components/AnalyticsBridge";
import type { PublicDecisionProof } from "../home/decision-proof";
import type { InvestigationCase } from "../home/investigation-case";

const paths = [
  {
    id: "cook",
    label: "Cook something",
    detail: "Recipes, technique, scaling, ingredients, and shopping lists.",
    prompt: "Help me cook something great. Ask me what I want to make, how many people I am feeding, my budget, and how ambitious I want to be.",
  },
  {
    id: "fix",
    label: "Fix something",
    detail: "Troubleshoot equipment and decide whether to repair, replace, or wait.",
    prompt: "Help me troubleshoot something that is not working. Ask for the symptoms, equipment type, model if I have it, and what I have already checked.",
  },
  {
    id: "product",
    label: "Find the right product",
    detail: "Compare real options, fit, evidence, price, and total cost.",
    prompt: "Help me find the right product for the job. Ask what I need it to do, my constraints, my budget, and what matters most before recommending options.",
  },
  {
    id: "cost",
    label: "Cut the cost",
    detail: "Food cost, purchasing, labor, waste, and operating decisions.",
    prompt: "Help me reduce a kitchen or hospitality cost without making the operation worse. Ask what cost is causing the problem and what constraints I cannot compromise.",
  },
  {
    id: "operate",
    label: "Run the kitchen",
    detail: "Prep, staffing, systems, menus, food safety, and day-to-day operations.",
    prompt: "Help me run the kitchen better. Ask what operation I am managing, what is breaking down, and what outcome I need most right now.",
  },
] as const;

export default function StartPage() {
  const [selected, setSelected] = useState<(typeof paths)[number] | null>(null);
  const [intakeKey, setIntakeKey] = useState(0);
  const [decisionProof, setDecisionProof] = useState<PublicDecisionProof | null>(null);
  const [investigationCase, setInvestigationCase] = useState<InvestigationCase | null>(null);

  useEffect(() => {
    trackCommercialEvent("content_view", { source: "guided_start", contentId: "chef-gringo-start", pagePath: "/start" });
  }, []);

  function choosePath(path: (typeof paths)[number]) {
    setSelected(path);
    setDecisionProof(null);
    setInvestigationCase(null);
    setIntakeKey((current) => current + 1);
    trackEvent("guided_start_path_selected", { source: "guided_start", contentId: path.id });
    window.setTimeout(() => document.getElementById("guided-start-intake")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  return (
    <main style={{ background: "#141411", color: "#f4efe4", minHeight: "100vh" }}>
      <section style={{ borderBottom: "1px solid #39362f", background: "linear-gradient(135deg,#141411 0%,#24211b 70%,#311712 100%)" }}>
        <div className="cg-width-wide" style={{ paddingTop: "clamp(3.5rem,8vw,7rem)", paddingBottom: "clamp(3rem,7vw,6rem)" }}>
          <p style={{ margin: 0, color: "#d3493c", fontWeight: 900, letterSpacing: ".16em", textTransform: "uppercase", fontSize: ".75rem" }}>Decision → Action</p>
          <h1 style={{ maxWidth: 900, marginTop: ".8rem", color: "#f7f0e5" }}>Bring me the problem.</h1>
          <p style={{ maxWidth: 760, color: "#c9c0b4", fontSize: "clamp(1.05rem,2vw,1.3rem)" }}>
            Start with what you are trying to accomplish. Chef Gringo will ask the useful questions, open up the realistic routes, and help you decide what to do next.
          </p>
          <p style={{ color: "#8f877c", fontSize: ".9rem" }}>No perfect prompt required. Pick a lane or type exactly what you want.</p>
        </div>
      </section>

      <section style={{ background: "#1d1c18", borderBottom: "1px solid #39362f" }} aria-labelledby="guided-start-title">
        <div className="cg-width-wide" style={{ paddingTop: "3rem", paddingBottom: "3.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "2rem", alignItems: "end", flexWrap: "wrap", marginBottom: "1.5rem" }}>
            <div>
              <p style={{ margin: 0, color: "#d3493c", fontWeight: 900, letterSpacing: ".14em", textTransform: "uppercase", fontSize: ".72rem" }}>Start anywhere</p>
              <h2 id="guided-start-title" style={{ color: "#f7f0e5", marginTop: ".35rem" }}>What are we working on?</h2>
            </div>
            <span style={{ color: "#8f877c", fontSize: ".85rem" }}>Recommendation first. Commercial routes only when they help.</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: "1rem" }}>
            {paths.map((path, index) => (
              <button
                type="button"
                key={path.id}
                onClick={() => choosePath(path)}
                aria-pressed={selected?.id === path.id}
                style={{
                  minHeight: 190,
                  padding: "1.35rem",
                  textAlign: "left",
                  border: selected?.id === path.id ? "2px solid #d3493c" : "1px solid #49453d",
                  borderRadius: 12,
                  background: selected?.id === path.id ? "#2b211d" : "#24231f",
                  color: "#f4efe4",
                  cursor: "pointer",
                }}
              >
                <span style={{ display: "block", marginBottom: "2rem", color: "#d3493c", fontWeight: 900, fontSize: ".7rem", letterSpacing: ".12em" }}>0{index + 1}</span>
                <strong style={{ display: "block", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "1.35rem", marginBottom: ".55rem" }}>{path.label}</strong>
                <span style={{ display: "block", color: "#aaa196", lineHeight: 1.45, fontSize: ".9rem" }}>{path.detail}</span>
                <b style={{ display: "block", marginTop: "1.2rem", color: "#f7f0e5", fontSize: ".82rem" }}>{selected?.id === path.id ? "Selected ✓" : "Start here →"}</b>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section id="guided-start-intake" style={{ background: "#f7f2e8", color: "#1d211f", scrollMarginTop: 110 }}>
        <div className="cg-width-wide" style={{ paddingTop: "clamp(3rem,7vw,5.5rem)", paddingBottom: "clamp(4rem,8vw,7rem)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,.75fr) minmax(0,1.25fr)", gap: "clamp(2rem,6vw,5rem)", alignItems: "start" }}>
            <div>
              <p className="cg-type-operational">Chef Gringo is ready</p>
              <h2>{selected ? selected.label : "Or just tell me what is going on."}</h2>
              <p style={{ color: "#595e59" }}>
                {selected ? "I preloaded a starting prompt for this path. Change any part of it or replace it completely." : "You do not need to choose a category. Type the problem in your own words and Chef Gringo will take it from there."}
              </p>
            </div>
            <HomepageIntake
              key={intakeKey}
              initialRequest={selected?.prompt || ""}
              source="guided_start"
              onDecisionProof={setDecisionProof}
              onInvestigationCase={setInvestigationCase}
            />
          </div>
        </div>
      </section>

      {decisionProof && <DecisionProofPanel proof={decisionProof} />}
      {investigationCase && <InvestigationCasePanel investigation={investigationCase} />}
    </main>
  );
}
