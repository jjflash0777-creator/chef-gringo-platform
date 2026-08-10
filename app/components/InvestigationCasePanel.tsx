"use client";

import { FormEvent, useState } from "react";
import { applyFollowUpAnswer, type InvestigationCase } from "../home/investigation-case";

const statusLabels: Record<InvestigationCase["status"], string> = { NEEDS_INFORMATION: "Needs information", INVESTIGATING: "Investigation open", PROFESSIONAL_VERIFICATION_REQUIRED: "Professional verification required", VERIFY_FIRST: "Verify first", READY_FOR_DECISION: "Ready for decision", NO_VIABLE_ROUTE: "No viable route" };
const routeLabels = { repair: "Repair", domestic: "Domestic replacement", used_refurbished: "Used / refurbished", factory_direct: "Factory-direct alternative", upgrade: "Upgrade" } as const;
const routeStatusLabels = { not_ready: "Not ready", needs_quote: "Needs quote", needs_compatibility_verification: "Verify compatibility" } as const;
const evidenceLabels = { user_provided: "User-provided", inferred: "Inferred", verified: "Verified", unknown: "Unknown" } as const;

export function InvestigationCasePanel({ investigation }: { investigation: InvestigationCase }) {
  const [current, setCurrent] = useState(investigation);
  const [answer, setAnswer] = useState("");
  const [answerState, setAnswerState] = useState<"idle" | "validation" | "updated">("idle");
  const [correctionTopic, setCorrectionTopic] = useState("");
  const [correctionValue, setCorrectionValue] = useState("");
  const priorities = current.evidenceRequirements.filter((item) => item.priority === "critical_now" || item.priority === "high_value");
  const usefulLater = current.evidenceRequirements.filter((item) => item.priority === "useful_later");
  const professional = current.evidenceRequirements.filter((item) => item.priority === "professional_only");
  const question = current.nextQuestion;

  function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question || !answer.trim()) { setAnswerState("validation"); return; }
    try {
      const updated = applyFollowUpAnswer(current, { requirementId: question.id, value: answer, answeredAt: new Date().toISOString() });
      setCurrent(updated); setAnswer(""); setAnswerState("updated");
      window.requestAnimationFrame(() => document.getElementById(updated.nextQuestion ? "next-question-title" : "readiness-title")?.focus());
    } catch { setAnswerState("validation"); }
  }

  function submitCorrection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!correctionTopic || !correctionValue) { setAnswerState("validation"); return; }
    try {
      const updated = applyFollowUpAnswer(current, { requirementId: correctionTopic, value: correctionValue, answeredAt: new Date().toISOString() });
      setCurrent(updated); setCorrectionTopic(""); setCorrectionValue(""); setAnswerState("updated");
      window.requestAnimationFrame(() => document.getElementById("source-ledger-title")?.focus());
    } catch { setAnswerState("validation"); }
  }

  return (
    <section className="cg-decision-proof cg-investigation-case" id="investigation-case" aria-labelledby="investigation-case-title">
      <div className="cg-width-wide">
        <header className="cg-case-header">
          <div><p className="cg-type-operational">Real investigation · Ephemeral case · Version {current.version}</p><h2 id="investigation-case-title" className="cg-type-display" tabIndex={-1}>Here’s what I understood.</h2></div>
          <div className={`cg-case-state cg-investigation-state-${current.status.toLowerCase()}`}><span>Investigation state</span><strong>{statusLabels[current.status]}</strong><small>No diagnosis or recommendation yet</small></div>
        </header>

        <div className="cg-case-summary">
          <article><span>User problem</span><p>{current.userProblem}</p></article>
          <article><span>Equipment identity</span><p>{current.equipment.identity ?? "Unknown foodservice equipment"}</p><small>{[current.equipment.manufacturer, current.equipment.modelNumber].filter(Boolean).join(" · ") || "Manufacturer and model unknown"}</small></article>
        </div>

        <section className="cg-case-progress" aria-label="Meaningful case progress">
          <div><span>Identity</span><strong>{current.progress.identityEstablished ? "Established from user evidence" : "Not established"}</strong></div>
          <div><span>Operating state</span><strong>{current.progress.operatingState}</strong></div>
          <div><span>Critical evidence</span><strong>{current.progress.criticalFactsKnown} known · {current.progress.criticalFactsMissing} missing</strong></div>
          <div><span>Decision</span><strong>Not ready</strong></div>
        </section>

        <div className="cg-evidence-board">
          <article><h3>What we know</h3>{current.knownFacts.length ? <ul>{current.knownFacts.map((fact) => <li key={fact}>{fact}</li>)}</ul> : <p className="cg-case-empty">No facts are verified or specific enough to rely on yet.</p>}</article>
          <article><h3>What remains unknown</h3><ul>{current.unknowns.map((item) => <li key={item}>{item}</li>)}</ul></article>
        </div>

        <section className="cg-next-action" aria-labelledby="next-question-title">
          {question ? <>
            <header><p className="cg-type-operational">Next best question</p><h3 id="next-question-title" tabIndex={-1}>{question.question}</h3><p>{question.why}</p></header>
            <div className="cg-next-action-grid"><div><span>Why this matters</span><p>{question.decisionImpact}</p><small>{question.priority.replaceAll("_", " ")} · safe observation</small></div>
              <form onSubmit={submitAnswer} noValidate>
                <label htmlFor="investigation-answer">Your answer</label>
                {question.answerType === "yes_no_unsure" ? <select id="investigation-answer" value={answer} onChange={(event) => { setAnswer(event.target.value); setAnswerState("idle"); }}><option value="">Choose one</option><option value="yes">Yes</option><option value="no">No</option><option value="unsure">Unsure</option></select> : <input id="investigation-answer" type={question.answerType === "temperature" || question.answerType === "numeric" ? "text" : "text"} inputMode={question.answerType === "temperature" || question.answerType === "numeric" ? "decimal" : undefined} value={answer} onChange={(event) => { setAnswer(event.target.value); setAnswerState("idle"); }} placeholder={question.answerType === "temperature" ? "Example: 49°F" : question.answerType === "model_serial" ? "Model number as shown" : "Enter what you can observe"} />}
                <button className="cg-button cg-button-primary" type="submit">Add to case</button>
                <div className="cg-follow-up-status" aria-live="polite">{answerState === "validation" && <p role="alert">Enter an answer before updating the case.</p>}{answerState === "updated" && <p>Evidence added. The case and next question were recomputed.</p>}</div>
              </form>
            </div>
          </> : <div className="cg-next-action-stop"><p className="cg-type-operational">Next action</p><h3 id="next-question-title" tabIndex={-1}>{professional.length ? "Qualified professional evidence is required." : "No safe user question is available."}</h3><p>{professional[0]?.why ?? "The current evidence does not support another user-directed step."}</p></div>}
        </section>

        {current.evidence.some((item) => item.topic === "condenser_state" || item.topic === "evaporator_fans") && <details className="cg-correction"><summary>Correct an earlier operating observation</summary><form onSubmit={submitCorrection}><label htmlFor="correction-topic">Observation</label><select id="correction-topic" value={correctionTopic} onChange={(event) => setCorrectionTopic(event.target.value)}><option value="">Choose one</option>{current.evidence.some((item) => item.topic === "condenser_state") && <option value="condenser_state">Condenser running</option>}{current.evidence.some((item) => item.topic === "evaporator_fans") && <option value="evaporator_fans">Evaporator fans running</option>}</select><label htmlFor="correction-value">Corrected observation</label><select id="correction-value" value={correctionValue} onChange={(event) => setCorrectionValue(event.target.value)}><option value="">Choose one</option><option value="yes">Yes</option><option value="no">No</option><option value="unsure">Unsure</option></select><button className="cg-button cg-button-secondary" type="submit">Add correction to history</button></form></details>}

        <section className="cg-source-ledger" aria-labelledby="source-ledger-title">
          <header><p className="cg-type-operational">Evidence ledger</p><h3 id="source-ledger-title" tabIndex={-1}>Claims keep their source, order, and state.</h3></header>
          {current.evidence.length ? <ol>{current.evidence.map((item) => <li key={item.id} className={`cg-evidence-consistency-${item.consistency}`}><div className="cg-evidence-badges"><span className={`cg-evidence-state cg-evidence-${item.state}`}>{evidenceLabels[item.state]}</span>{item.consistency !== "consistent" && <span className="cg-evidence-consistency">{item.consistency}</span>}</div><div><strong>{item.claim}</strong><p>{item.source} · {item.confidence} confidence · {item.timestamp.slice(0, 10)}</p>{item.notes.map((note) => <small key={note}>{note}</small>)}</div></li>)}</ol> : <p className="cg-case-empty">No specific operating facts were supplied. Equipment identity and condition remain unknown.</p>}
        </section>

        <section className="cg-evidence-request" aria-labelledby="evidence-request-title">
          <header><p className="cg-type-operational">Outstanding evidence</p><h3 id="evidence-request-title">What the case still needs</h3><p>The workflow asks one question at a time even when several requirements remain.</p></header>
          <div className="cg-evidence-priority"><article><span>Critical and high-value</span>{priorities.length ? <ol>{priorities.map((item) => <li key={item.id}><strong>{item.label}</strong><p>{item.why}</p></li>)}</ol> : <p>No user-answerable critical evidence remains.</p>}</article><article><span>Useful later</span>{usefulLater.length ? <ol>{usefulLater.map((item) => <li key={item.id}><strong>{item.label}</strong><p>{item.why}</p></li>)}</ol> : <p>No secondary requests yet.</p>}</article></div>
        </section>

        <section className={`cg-safety-gate cg-safety-${current.safety.state}`} aria-labelledby="safety-gate-title"><div><p className="cg-type-operational">Safety state</p><h3 id="safety-gate-title">{current.safety.state === "safe_observation" ? "Safe observation only" : current.safety.state === "do_not_proceed" ? "Do not proceed" : "Professional verification required"}</h3><p>{current.safety.reason}</p></div><ul>{current.safety.allowedActions.map((action) => <li key={action}>{action}</li>)}</ul></section>

        <section className="cg-route-file" aria-labelledby="real-route-file-title"><header><p className="cg-type-operational">Candidate routes</p><h3 id="real-route-file-title">Routes progress, but remain gated.</h3></header><ol>{current.candidateRoutes.map((route, index) => <li key={route.route} className="cg-route-not_evaluated"><span>{String(index + 1).padStart(2, "0")}</span><div><small>{routeLabels[route.route]}</small><strong>{routeStatusLabels[route.status]}</strong><p>{route.rationale}</p></div><em>{route.status === "not_ready" ? "Evidence required" : routeStatusLabels[route.status]}</em></li>)}</ol></section>

        <section className="cg-investigation-plan" aria-labelledby="investigation-plan-title"><header><p className="cg-type-operational">Investigation plan</p><h3 id="investigation-plan-title">The next steps stay constrained.</h3></header><ol>{current.investigationPlan.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span><p>{step}</p></li>)}</ol></section>

        <section className="cg-case-verdict" aria-labelledby="readiness-title"><div><p className="cg-type-operational">Decision readiness</p><h3 id="readiness-title" tabIndex={-1}>{statusLabels[current.status]}</h3><p>{current.status === "PROFESSIONAL_VERIFICATION_REQUIRED" ? "The next useful evidence crosses a safety boundary. A qualified professional must verify the operating state before the case can advance." : "The case can advance as evidence is supplied. No cause, repair, replacement, or savings claim has been established."}</p></div><dl><div><dt>Diagnosis</dt><dd>Unknown</dd></div><div><dt>Recommendation</dt><dd>No recommendation yet</dd></div><div><dt>Case history</dt><dd>{current.version} versions · {current.transitions.length} state records</dd></div><div><dt>Persistence</dt><dd>Ephemeral · nothing saved</dd></div></dl></section>
      </div>
    </section>
  );
}
