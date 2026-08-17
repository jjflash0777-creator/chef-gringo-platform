import type { D1DatabaseLike } from "./index.ts";

export const DECISION_BRIEF_PRICE_CENTS = 9900;
export const DECISION_BRIEF_CURRENCY = "USD";
export const DECISION_BRIEF_POLICY_VERSION = "2026-08-17";
export const DECISION_BRIEF_SOURCE = "repair-or-replace-pilot";

export const DECISION_BRIEF_STATUSES = [
  "awaiting_payment",
  "paid",
  "in_review",
  "waiting_on_customer",
  "delivered",
  "refunded",
  "cancelled",
] as const;

export type DecisionBriefStatus = typeof DECISION_BRIEF_STATUSES[number];

export type DecisionBriefInput = {
  email: string;
  firstName: string;
  businessName?: string | null;
  phone?: string | null;
  equipmentType: string;
  manufacturer?: string | null;
  modelNumber?: string | null;
  equipmentAge?: string | null;
  problemSummary: string;
  evidenceSummary?: string | null;
  currentQuote?: string | null;
  urgency: "planning" | "soon" | "urgent";
  marketingConsent: boolean;
  policyVersion: string;
  companyWebsite?: string | null;
};

export type DecisionBriefRequest = Omit<DecisionBriefInput, "companyWebsite"> & {
  id: string;
  source: string;
  status: DecisionBriefStatus;
  amountCents: number;
  currency: string;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type DecisionBriefRow = Omit<DecisionBriefRequest, "marketingConsent"> & { marketingConsent: number | boolean };

const CASE_ID = /^brief_[a-f0-9]{32}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URGENCIES = new Set(["planning", "soon", "urgent"]);
const clean = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);

export function isDecisionBriefCaseId(value: string): boolean {
  return CASE_ID.test(value);
}

export function createDecisionBriefCaseId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return `brief_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export function validateDecisionBriefInput(raw: Partial<DecisionBriefInput>): DecisionBriefInput {
  const input: DecisionBriefInput = {
    email: clean(raw.email, 254).toLowerCase(),
    firstName: clean(raw.firstName, 80),
    businessName: clean(raw.businessName, 160) || null,
    phone: clean(raw.phone, 40) || null,
    equipmentType: clean(raw.equipmentType, 160),
    manufacturer: clean(raw.manufacturer, 120) || null,
    modelNumber: clean(raw.modelNumber, 120) || null,
    equipmentAge: clean(raw.equipmentAge, 80) || null,
    problemSummary: clean(raw.problemSummary, 4000),
    evidenceSummary: clean(raw.evidenceSummary, 4000) || null,
    currentQuote: clean(raw.currentQuote, 500) || null,
    urgency: URGENCIES.has(String(raw.urgency)) ? raw.urgency as DecisionBriefInput["urgency"] : "planning",
    marketingConsent: raw.marketingConsent === true,
    policyVersion: clean(raw.policyVersion, 40),
    companyWebsite: clean(raw.companyWebsite, 500) || null,
  };
  if (!EMAIL.test(input.email)) throw new Error("A valid email address is required.");
  if (input.firstName.length < 2) throw new Error("First name is required.");
  if (input.equipmentType.length < 2) throw new Error("Equipment type is required.");
  if (input.problemSummary.length < 20) throw new Error("Describe the equipment problem in at least 20 characters.");
  if (input.policyVersion !== DECISION_BRIEF_POLICY_VERSION) throw new Error("Please review the current service terms.");
  return input;
}

const select = `SELECT id,email,first_name AS firstName,business_name AS businessName,phone,equipment_type AS equipmentType,manufacturer,model_number AS modelNumber,equipment_age AS equipmentAge,problem_summary AS problemSummary,evidence_summary AS evidenceSummary,current_quote AS currentQuote,urgency,marketing_consent AS marketingConsent,policy_version AS policyVersion,source,status,amount_cents AS amountCents,currency,stripe_checkout_session_id AS stripeCheckoutSessionId,stripe_payment_intent_id AS stripePaymentIntentId,paid_at AS paidAt,created_at AS createdAt,updated_at AS updatedAt FROM decision_brief_requests`;
const hydrate = (row: DecisionBriefRow): DecisionBriefRequest => ({ ...row, marketingConsent: Boolean(row.marketingConsent) });

export async function createDecisionBriefRequest(db: D1DatabaseLike, raw: Partial<DecisionBriefInput>) {
  const input = validateDecisionBriefInput(raw);
  const id = createDecisionBriefCaseId();
  await db.prepare(`INSERT INTO decision_brief_requests (id,email,first_name,business_name,phone,equipment_type,manufacturer,model_number,equipment_age,problem_summary,evidence_summary,current_quote,urgency,marketing_consent,policy_version,source,status,amount_cents,currency) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(id, input.email, input.firstName, input.businessName, input.phone, input.equipmentType, input.manufacturer, input.modelNumber, input.equipmentAge, input.problemSummary, input.evidenceSummary ?? "", input.currentQuote, input.urgency, input.marketingConsent ? 1 : 0, input.policyVersion, DECISION_BRIEF_SOURCE, "awaiting_payment", DECISION_BRIEF_PRICE_CENTS, DECISION_BRIEF_CURRENCY).run();
  return (await getDecisionBriefRequest(db, id))!;
}

export async function getDecisionBriefRequest(db: D1DatabaseLike, id: string) {
  if (!isDecisionBriefCaseId(id)) return null;
  const row = await db.prepare(`${select} WHERE id=?`).bind(id).first<DecisionBriefRow>();
  return row ? hydrate(row) : null;
}

export async function listDecisionBriefRequests(db: D1DatabaseLike) {
  const result = await db.prepare(`${select} ORDER BY CASE status WHEN 'paid' THEN 0 WHEN 'in_review' THEN 1 WHEN 'waiting_on_customer' THEN 2 WHEN 'awaiting_payment' THEN 3 ELSE 4 END, created_at DESC`).all<DecisionBriefRow>();
  return result.results.map(hydrate);
}

export type VerifiedStripePayment = {
  caseId: string;
  checkoutSessionId: string;
  paymentIntentId: string | null;
  amountTotal: number;
  currency: string;
  paidAt: string;
};

export async function markDecisionBriefPaid(db: D1DatabaseLike, payment: VerifiedStripePayment) {
  if (!isDecisionBriefCaseId(payment.caseId)) throw new Error("Stripe payment did not contain a valid brief case ID.");
  if (payment.amountTotal !== DECISION_BRIEF_PRICE_CENTS || payment.currency.toUpperCase() !== DECISION_BRIEF_CURRENCY) throw new Error("Stripe payment amount or currency did not match the decision brief.");
  const existing = await getDecisionBriefRequest(db, payment.caseId);
  if (!existing) throw new Error("Decision brief request was not found.");
  if (existing.status === "paid" && existing.stripeCheckoutSessionId === payment.checkoutSessionId) return existing;
  if (existing.status !== "awaiting_payment") throw new Error("Decision brief is not awaiting payment.");
  await db.prepare(`UPDATE decision_brief_requests SET status='paid',stripe_checkout_session_id=?,stripe_payment_intent_id=?,paid_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='awaiting_payment'`)
    .bind(payment.checkoutSessionId, payment.paymentIntentId, payment.paidAt, payment.caseId).run();
  return (await getDecisionBriefRequest(db, payment.caseId))!;
}
