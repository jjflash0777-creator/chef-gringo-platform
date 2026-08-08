"use client";

import { useMemo, useState } from "react";
import type { DecisionCaseServiceOutput } from "../../../marketplace/intelligence/decision-case-service";
import { DECISION_ROUTES, RISK_GATE_TYPES, type CommercialOpportunity, type DecisionRoute, type MoneyRange, type RiskGate } from "../../../marketplace/intelligence/decision-engine";
import type { IntelligenceConfidence } from "../../../marketplace/intelligence/types";
import { analyzeIntelligenceCase } from "./actions";
import { buildLabCase, costKeys, costLabels, createBlastChillerDemoDraft, createEmptyDraft, gateLabels, routeLabels, type CostKey, type LabDraft, type RouteDraft } from "./lab-model";

const verdictLabels: Record<string, string> = { REPAIR: "Repair It", BUY_DOMESTIC: "Buy Domestic", BUY_USED_OR_REFURBISHED: "Buy Used / Refurbished", BUY_FACTORY_DIRECT: "Buy Factory Direct", UPGRADE: "Upgrade", GET_QUOTE: "Get a Quote", VERIFY_FIRST: "Verify First", PROFESSIONAL_SERVICE: "Professional Service", INSUFFICIENT_EVIDENCE: "Insufficient Evidence" };
const formatMoney = (range: MoneyRange | null) => range ? new Intl.NumberFormat("en-US", { style: "currency", currency: range.currency }).format(range.expectedCents / 100) : "Unknown";

export function IntelligenceLab() {
  const [draft, setDraft] = useState<LabDraft>(createEmptyDraft);
  const [result, setResult] = useState<DecisionCaseServiceOutput | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const activeRoutes = useMemo(() => DECISION_ROUTES.filter((route) => draft.routes[route].enabled), [draft.routes]);
  const updateRoute = (route: DecisionRoute, patch: Partial<RouteDraft>) => setDraft((current) => ({ ...current, routes: { ...current.routes, [route]: { ...current.routes[route], ...patch } } }));
  async function analyze() {
    const built = buildLabCase(draft, new Date().toISOString().slice(0, 10)); setErrors(built.errors); setResult(null);
    if (!built.input) return;
    setRunning(true);
    try { const response = await analyzeIntelligenceCase(built.input); if (response.ok) setResult(response.result); else setErrors(response.errors.map((error) => `${error.path}: ${error.message}`)); }
    finally { setRunning(false); }
  }
  return <div className="intelligence-lab">
    <header className="intelligence-hero"><div><p className="eyebrow">Founder-only · Intelligence Lab</p><h1>What are you trying to fix, replace, improve, or buy?</h1><p>Compare real routes. Unknown information stays unknown, and Chef Gringo identifies what must be verified.</p></div><button type="button" className="demo-button" onClick={() => { setDraft(createBlastChillerDemoDraft()); setResult(null); setErrors([]); }}>Load synthetic blast-chiller demo</button></header>

    <section className="lab-panel"><Heading number="01" title="Tell us what is happening" text="Start with the operating problem—not a product pitch." /><div className="lab-grid">
      <label className="lab-wide">Problem description<textarea value={draft.problem} onChange={(event) => setDraft({ ...draft, problem: event.target.value })} placeholder="What is happening, and what outcome do you need?" /></label><div className="photo-coming"><strong>Upload a photo</strong><span>Coming next · no upload occurs</span></div>
      <Field label="Equipment / product" value={draft.productName} onChange={(productName) => setDraft({ ...draft, productName })} /><Field label="Model number" value={draft.modelNumber} onChange={(modelNumber) => setDraft({ ...draft, modelNumber })} /><Field label="Category" value={draft.category} onChange={(category) => setDraft({ ...draft, category })} /><Field label="Operating environment" value={draft.environment} onChange={(environment) => setDraft({ ...draft, environment })} /><Field label="Budget (USD)" value={draft.budget} onChange={(budget) => setDraft({ ...draft, budget })} inputMode="decimal" />
      <label>Urgency<select value={draft.urgency} onChange={(event) => setDraft({ ...draft, urgency: event.target.value as LabDraft["urgency"] })}><option value="routine">Routine</option><option value="soon">Soon</option><option value="urgent">Urgent</option></select></label>
    </div></section>

    <section className="lab-panel"><Heading number="02" title="Location and current equipment" text="Destination changes freight, duties, compatibility, and final cost." /><div className="lab-grid three-column">
      <Field label="Country" value={draft.country} onChange={(country) => setDraft({ ...draft, country })} /><Field label="State / region" value={draft.region} onChange={(region) => setDraft({ ...draft, region })} /><Field label="Postal code" value={draft.postalCode} onChange={(postalCode) => setDraft({ ...draft, postalCode })} /><Field label="Approximate age" value={draft.equipmentAge} onChange={(equipmentAge) => setDraft({ ...draft, equipmentAge })} /><Field label="Current condition" value={draft.equipmentCondition} onChange={(equipmentCondition) => setDraft({ ...draft, equipmentCondition })} /><Field label="Repair estimate" value={draft.repairEstimate} onChange={(repairEstimate) => setDraft({ ...draft, repairEstimate })} inputMode="decimal" /><Field label="Replacement quote" value={draft.replacementQuote} onChange={(replacementQuote) => setDraft({ ...draft, replacementQuote })} inputMode="decimal" />
    </div></section>

    <section className="lab-panel"><Heading number="03" title="Add the routes you want compared" text="Leave unknown costs blank. Never invent a number to complete the form." />
      <div className="route-switches">{DECISION_ROUTES.map((route) => <label key={route}><input type="checkbox" checked={draft.routes[route].enabled} onChange={(event) => updateRoute(route, { enabled: event.target.checked })} /><span>{routeLabels[route]}</span></label>)}</div>
      <div className="route-editors">{activeRoutes.map((route) => <RouteEditor key={route} route={route} value={draft.routes[route]} update={(patch) => updateRoute(route, patch)} />)}</div>
    </section>

    <section className="lab-panel commercial-input"><div><p className="eyebrow">Internal commercial intelligence</p><h2>Commercial classification</h2><p>Stored outside verdict inputs. It cannot affect the recommendation.</p></div><label>Opportunity type<select value={draft.commercialType} onChange={(event) => setDraft({ ...draft, commercialType: event.target.value as CommercialOpportunity["type"] })}><option value="none">None</option><option value="affiliate">Affiliate</option><option value="referral">Referral</option><option value="direct_manufacturer">Direct manufacturer</option><option value="wholesale">Wholesale</option><option value="dropship">Dropship</option><option value="oem_private_label">OEM / private label</option><option value="saas_recurring">SaaS recurring</option></select></label></section>
    {errors.length > 0 && <section className="lab-errors" role="alert"><h2>Before Chef Gringo can analyze this</h2><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul></section>}
    <div className="analyze-bar"><div><strong>Ready to compare?</strong><span>Deterministic analysis. No network calls, AI, or storage.</span></div><button type="button" className="button" disabled={running} onClick={() => void analyze()}>{running ? "Analyzing…" : "Analyze My Options"}</button></div>
    {result && <Results result={result} />}
  </div>;
}

function Heading({ number, title, text }: { number: string; title: string; text: string }) { return <div className="lab-section-heading"><div><span>{number}</span><h2>{title}</h2></div><p>{text}</p></div>; }
function Field({ label, value, onChange, inputMode }: { label: string; value: string; onChange: (value: string) => void; inputMode?: "decimal" }) { return <label>{label}<input inputMode={inputMode} value={value} onChange={(event) => onChange(event.target.value)} /></label>; }

function RouteEditor({ route, value, update }: { route: DecisionRoute; value: RouteDraft; update: (patch: Partial<RouteDraft>) => void }) {
  return <details open className="route-editor"><summary><strong>{routeLabels[route]}</strong><span>{value.costs.productPrice ? `${value.currency} ${value.costs.productPrice}` : "Price unknown"}</span></summary><div className="lab-grid three-column">
    <Field label="Product / option" value={value.label} onChange={(label) => update({ label })} /><Field label="Supplier" value={value.supplier} onChange={(supplier) => update({ supplier })} /><Field label="Currency" value={value.currency} onChange={(currency) => update({ currency: currency.toUpperCase() })} />
    <label>Price basis<select value={value.basis} onChange={(event) => update({ basis: event.target.value as RouteDraft["basis"] })}><option value="observed">Observed</option><option value="estimated">Estimated</option></select></label>
    {costKeys.map((key: CostKey) => <Field key={key} label={costLabels[key]} value={value.costs[key]} onChange={(amount) => update({ costs: { ...value.costs, [key]: amount } })} inputMode="decimal" />)}
    <Field label="Evidence / source URL" value={value.sourceUrl} onChange={(sourceUrl) => update({ sourceUrl })} /><label>Evidence confidence<select value={value.confidence} onChange={(event) => update({ confidence: event.target.value as IntelligenceConfidence })}><option value="insufficient">Insufficient</option><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option></select></label>
    <Field label="Other cost label" value={value.otherLabel} onChange={(otherLabel) => update({ otherLabel })} /><Field label="Other explicit cost" value={value.otherCost} onChange={(otherCost) => update({ otherCost })} inputMode="decimal" />
  </div><fieldset className="gate-grid"><legend>Risk and verification</legend>{RISK_GATE_TYPES.map((gate) => <label key={gate}>{gateLabels[gate]}<select value={value.gates[gate]} onChange={(event) => update({ gates: { ...value.gates, [gate]: event.target.value as RiskGate["status"] } })}><option value="unknown">Unknown</option><option value="verified">Verified</option><option value="failed">Failed</option><option value="not_applicable">Not applicable</option></select></label>)}</fieldset></details>;
}

function Results({ result }: { result: DecisionCaseServiceOutput }) {
  const savings = result.savingsComparisons.filter((item) => item.publishable);
  return <section className="lab-results" aria-live="polite"><header className="verdict-card"><p className="eyebrow">Chef Gringo verdict</p><h2>{verdictLabels[result.verdict.verdict]}</h2><p>{result.verdict.rationale}</p></header>
    <section className="result-section"><Heading number="01" title="Option comparison" text="Upfront price is shown separately from estimated landed cost." /><div className="comparison-grid">{result.availableRoutes.map((route) => <article className={route.available ? "available" : ""} key={route.route}><h3>{routeLabels[route.route]}</h3>{route.available ? <><strong>{route.landedCost?.total ? formatMoney(route.landedCost.total) : "Landed cost unknown"}</strong><p>Upfront: {formatMoney(route.landedCost?.productPrice || null)}</p><div className="result-tags"><span className={route.landedCost?.complete ? "good" : "warn"}>{route.landedCost?.complete ? "Complete cost" : "Incomplete cost"}</span><span className={route.viable ? "good" : "warn"}>{route.viable ? "Viable" : "Verify"}</span></div><small>{route.blockingRiskGates.map((gate) => gateLabels[gate as keyof typeof gateLabels]).join(" · ")}</small></> : <p>Not included</p>}</article>)}</div></section>
    <section className="result-section scenarios"><Heading number="02" title="Best, expected, and worst case" text="Unknown scenarios remain unknown." /><div>{result.scenarios.map((scenario) => <article key={scenario.kind}><span>{scenario.kind}</span><strong>{formatMoney(scenario.estimatedCost)}</strong><p>{scenario.assumptions.join(" · ")}</p></article>)}</div></section>
    <section className="result-section"><Heading number="03" title="Potential savings" text="Only complete landed-cost comparisons qualify." />{savings.length ? savings.map((item) => <article key={item.candidateRoute}><strong>{routeLabels[item.candidateRoute]}: {formatMoney(item.estimatedLandedSavings)}</strong><p>Estimated landed savings versus {routeLabels[item.baselineRoute].toLowerCase()}.</p></article>) : <div className="honest-empty"><strong>Actual landed savings cannot yet be calculated.</strong><p>A factory price is not customer cost. Complete freight, duty, delivery, taxes, and adaptation first.</p></div>}</section>
    <div className="result-split"><section className="result-section"><Heading number="04" title="Why Chef Gringo chose this" text="Deterministic explanation—no generated claims." /><p>{result.verdict.rationale}</p><p>Evidence confidence: <strong>{result.evidenceConfidence.caseConfidence}</strong></p></section><section className="result-section checklist"><Heading number="05" title="What we still need" text="Resolve these before relying on an incomplete route." />{result.unresolvedQuestions.length ? <ul>{result.unresolvedQuestions.map((question) => <li key={question}>{question}</li>)}</ul> : <p>No unresolved questions recorded.</p>}</section></div>
    <aside className="commercial-result"><p className="eyebrow">Internal only · Separated from recommendation</p><h2>Commercial opportunity</h2>{result.commercialOpportunities.map((item, index) => <div key={`${item.type}-${index}`}><strong>{item.type.replaceAll("_", " ")}</strong><p>{item.note}</p></div>)}<small>Commercial economics were attached after the verdict was calculated.</small></aside>
  </section>;
}
