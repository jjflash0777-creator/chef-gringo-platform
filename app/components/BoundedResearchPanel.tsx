"use client";

import { useMemo, useState } from "react";
import { createResearchRequirement, runBoundedResearch, type BoundedResearchResult, type ResearchRequirementType } from "../home/bounded-research";
import { conflictingPrimaryCandidates, sellerCompatibilityOnly, syntheticElectricalCandidates } from "../home/fixtures/bounded-research";
import type { InvestigationCase } from "../home/investigation-case";
import { PUBLIC_CAPABILITY_LABELS } from "../lib/research/capability";

const requirementLabels: Record<ResearchRequirementType, string> = {
  FIND_MANUFACTURER_MANUAL: "Find manufacturer manual",
  VERIFY_ELECTRICAL_SPEC: "Verify electrical specification",
  FIND_PARTS_DOCUMENTATION: "Find official parts documentation",
  VERIFY_PART_COMPATIBILITY: "Verify explicit part compatibility",
  VERIFY_WARRANTY: "Find official warranty terms",
};

function officialDomains(investigation: InvestigationCase) {
  return investigation.equipment.manufacturer === "Example Refrigeration Co." ? ["manufacturer.example.invalid"] : [];
}

export function BoundedResearchPanel({ investigation, onUpdated }: { investigation: InvestigationCase; onUpdated: (result: BoundedResearchResult) => void }) {
  const [type, setType] = useState<ResearchRequirementType>("VERIFY_ELECTRICAL_SPEC");
  const [state, setState] = useState<"idle" | "researching" | "complete" | "error">("idle");
  const [result, setResult] = useState<BoundedResearchResult | null>(null);
  const requirement = useMemo(() => createResearchRequirement(investigation, type, investigation.updatedAt, officialDomains(investigation)), [investigation, type]);

  function runResearch() {
    setState("researching"); setResult(null);
    window.setTimeout(() => {
      try {
        const candidates = type === "FIND_MANUFACTURER_MANUAL" ? conflictingPrimaryCandidates : type === "VERIFY_PART_COMPATIBILITY" ? [sellerCompatibilityOnly] : type === "VERIFY_WARRANTY" ? [] : syntheticElectricalCandidates;
        const next = runBoundedResearch(investigation, requirement, candidates, new Date().toISOString());
        setResult(next); setState("complete"); onUpdated(next);
      } catch { setState("error"); }
    }, 0);
  }

  return <section className="cg-bounded-research" aria-labelledby="bounded-research-title">
    <header><p className="cg-type-operational">Internal · Bounded source acquisition · Synthetic prototype</p><h3 id="bounded-research-title" tabIndex={-1}>Research only what the case needs.</h3><p>This explicit simulation inspects a fixed source set. It makes no live network request and cannot expand into general web research. A query list is not completed research.</p></header>
    <div className="cg-research-requirement">
      <div><span>What needs verification</span><strong>{requirement.exactQuestion}</strong></div>
      <div><span>Why</span><p>{requirement.whyItMatters}</p></div>
      <label htmlFor="research-requirement-type">Research path</label><select id="research-requirement-type" value={type} onChange={(event) => { setType(event.target.value as ResearchRequirementType); setState("idle"); setResult(null); }}>{Object.entries(requirementLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <div className="cg-research-limits"><span>Boundaries</span><p>Maximum 3 queries · 5 candidate sources · exact-model match · official domain first · stop on authoritative answer · 0 paid model or search calls</p></div>
      {requirement.status === "blocked" ? <p className="cg-research-blocked" role="status">Lookup is blocked until manufacturer, exact model, and an approved official domain are known.</p> : <button className="cg-button cg-button-primary" type="button" onClick={runResearch} disabled={state === "researching"}>{state === "researching" ? "Checking approved sources" : "Run bounded source check"}</button>}
      <div className="cg-research-status" aria-live="polite">{state === "researching" && "Consulting the fixed, approved source set."}{state === "error" && <span role="alert">The bounded source check could not be completed.</span>}</div>
    </div>
    {result && <div className="cg-research-result">
      <div><span>Research state</span><strong>{result.requirement.status}</strong></div>
      <div><span>Capability</span><strong>{result.capability.replaceAll("_", " ")}</strong><em>{PUBLIC_CAPABILITY_LABELS[result.capability]}</em></div>
      <div><span>Where Chef Gringo looked</span><p>{result.audit.queriesExecuted.length ? result.audit.queriesExecuted.map((query) => <code key={query}>{query}</code>) : "No queries — lookup blocked or unused."}</p></div>
      <div><span>Best source found</span>{result.bestSource ? <><strong>{result.bestSource.title}</strong><small>{result.bestSource.url}</small><em>Tier {result.bestSource.authorityTier} · {result.bestSource.authority.replaceAll("_", " ")} · exact model</em></> : <strong>None that safely resolves the requirement</strong>}</div>
      <div><span>What it established</span><p>{result.establishedFacts.length ? result.establishedFacts.join(" · ") : "No verified fact established"}</p></div>
      <div><span>What remains unresolved</span><p>{result.unresolvedReason ?? result.updatedCase.unknowns.join(" · ")}</p></div>
      <div><span>Case state</span><strong>{result.stateBefore.replaceAll("_", " ")} → {result.stateAfter.replaceAll("_", " ")}</strong></div>
      {result.conflicts.length > 0 && <div className="cg-research-conflicts"><span>Conflicting primary sources</span><ul>{result.conflicts.map((conflict) => <li key={conflict}>{conflict}</li>)}</ul></div>}
      <details><summary>Research audit trail</summary><p>{result.audit.sourcesConsidered.length} sources considered · stopped: {result.audit.stoppedBecause.replaceAll("_", " ")} · live retrieval: no · model calls: {result.audit.modelCalls}</p><ul>{result.audit.sourcesConsidered.map((source) => <li key={source.id}><strong>{source.title}</strong><small>{source.url}</small><span>{source.ingestionStatus.replaceAll("_", " ")}{source.rejectionReason ? ` — ${source.rejectionReason}` : ""}</span></li>)}</ul></details>
    </div>}
  </section>;
}
