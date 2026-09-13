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
    <div className="cg-guided-start">
      <section className="cg-guided-start-hero">
        <div className="cg-width-wide">
          <p className="cg-guided-start-kicker">Decision → Action</p>
          <h1>Bring me the problem.</h1>
          <p className="cg-guided-start-lede">
            Start with what you are trying to accomplish. Chef Gringo will ask the useful questions, open up the realistic routes, and help you decide what to do next.
          </p>
          <p className="cg-guided-start-note">No perfect prompt required. Pick a lane or type exactly what you want.</p>
        </div>
      </section>

      <section className="cg-guided-start-paths" aria-labelledby="guided-start-title">
        <div className="cg-width-wide">
          <div className="cg-guided-start-head">
            <div>
              <p className="cg-guided-start-kicker">Start anywhere</p>
              <h2 id="guided-start-title">What are we working on?</h2>
            </div>
            <span className="cg-guided-start-note">Recommendation first. Commercial routes only when they help.</span>
          </div>

          <div className="cg-guided-start-grid">
            {paths.map((path, index) => (
              <button
                type="button"
                className="cg-guided-start-path"
                key={path.id}
                onClick={() => choosePath(path)}
                aria-pressed={selected?.id === path.id}
              >
                <span className="cg-guided-start-index">0{index + 1}</span>
                <strong>{path.label}</strong>
                <em>{path.detail}</em>
                <b>{selected?.id === path.id ? "Selected ✓" : "Start here →"}</b>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section id="guided-start-intake" className="cg-guided-start-intake">
        <div className="cg-width-wide">
          <div className="cg-guided-start-intake-grid">
            <div>
              <p className="cg-type-operational">Chef Gringo is ready</p>
              <h2>{selected ? selected.label : "Or just tell me what is going on."}</h2>
              <p>
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
    </div>
  );
}
