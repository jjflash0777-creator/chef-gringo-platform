"use client";

import { useMemo, useState } from "react";
import { BoundedResearchPanel } from "../../../components/BoundedResearchPanel";
import { CorpusLibraryPanel } from "./CorpusLibraryPanel";
import type { BoundedResearchResult } from "../../../home/bounded-research";
import { identifiedFreezerEvidence, identifiedFreezerProblem, investigationCapturedAt, insufficientFreezerProblem } from "../../../home/fixtures/investigation-cases";
import { createInvestigationCase, type InvestigationCase } from "../../../home/investigation-case";

export function BoundedResearchWorkspace() {
  const identifiedSeed = useMemo(
    () => createInvestigationCase({ problem: identifiedFreezerProblem, capturedAt: investigationCapturedAt, suppliedEvidence: identifiedFreezerEvidence }),
    [],
  );
  const unidentifiedSeed = useMemo(
    () => createInvestigationCase({ problem: insufficientFreezerProblem, capturedAt: investigationCapturedAt }),
    [],
  );
  const [caseKind, setCaseKind] = useState<"identified" | "unidentified">("identified");
  const [identifiedCase, setIdentifiedCase] = useState<InvestigationCase>(identifiedSeed);
  const investigation = caseKind === "identified" ? identifiedCase : unidentifiedSeed;

  function acceptResearch(result: BoundedResearchResult) {
    if (caseKind === "identified") setIdentifiedCase(result.updatedCase);
  }

  return (
    <main className="cg-public-scope cg-research-admin">
      <header className="cg-research-admin-intro">
        <p className="cg-type-operational">Founder-only · not a public control</p>
        <h1>Bounded research lab</h1>
        <p>Inspect plans, candidate ranking, validation, exclusions, and overrides. This page never fetches the web and never logs the operator question to analytics.</p>
        <label htmlFor="research-case">Synthetic case</label>
        <select
          id="research-case"
          value={caseKind}
          onChange={(event) => {
            const next = event.target.value as "identified" | "unidentified";
            setCaseKind(next);
            if (next === "identified") setIdentifiedCase(identifiedSeed);
          }}
        >
          <option value="identified">Identified CG-WIF-230 freezer</option>
          <option value="unidentified">Unidentified freezer — blocked lookup</option>
        </select>
      </header>
      <CorpusLibraryPanel />
      <BoundedResearchPanel investigation={investigation} onUpdated={acceptResearch} />
    </main>
  );
}
