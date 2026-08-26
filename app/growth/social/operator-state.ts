import { SOCIAL_PUBLISH_AVAILABLE } from "./types.ts";
import { assertNoEconomicsRankingFields } from "./commercial.ts";
import { materialInvestigationItems, type InvestigationItem } from "./investigation-refinement.ts";

/**
 * Autonomous Operator v1. Orchestrates permitted operations. Does not bypass
 * governance, accept evidence, approve packages, or publish.
 */
export const OPERATOR_VERSION = "autonomous-operator-v1";
/** One founder action may walk at most this many automatic transitions. */
export const MAX_OPERATOR_STEPS = 8;

export const OPERATOR_STATES = [
  "intake",
  "package_ready",
  "decomposition_needed",
  "refinement_needed",
  "investigation_review",
  "claims_needed",
  "evidence_gaps",
  "research_ready",
  "researching",
  "corpus_review_required",
  "evidence_reassessment",
  "content_blocked",
  "content_ready",
  "human_approval_required",
  "complete_for_current_authority",
] as const;
export type OperatorState = typeof OPERATOR_STATES[number];

export const HUMAN_REVIEW_TASK_KINDS = [
  "investigation_plan",
  "corpus_candidates",
  "publisher_identity",
  "contradiction",
  "package_approval",
  "publication_approval",
] as const;
export type HumanReviewTaskKind = typeof HUMAN_REVIEW_TASK_KINDS[number];

export const HUMAN_REVIEW_TASK_STATES = ["open", "acknowledged", "rejected"] as const;
export type HumanReviewTaskState = typeof HUMAN_REVIEW_TASK_STATES[number];

export const OPERATOR_ACTIONS = [
  "advance",
  "acknowledge_investigation_plan",
  "reject_investigation_plan",
] as const;
export type OperatorAction = typeof OPERATOR_ACTIONS[number];

export const FORBIDDEN_OPERATOR_ACTIONS = [
  "create_claims",
  "accept_corpus_evidence",
  "override_provenance",
  "approve_package",
  "approve_publication",
  "publish",
  "spend",
  "partner_outreach",
  "send_email",
  "schedule_post",
] as const;

export type OperatorPermission = {
  action: string;
  automaticWhenPreconditionsMet: boolean;
  requiresHumanAuthority: boolean;
  enabledInV1AutoChain: boolean;
  notes: string;
};

export const AUTONOMY_PERMISSION_MATRIX: readonly OperatorPermission[] = [
  { action: "generate_claim_proposals", automaticWhenPreconditionsMet: true, requiresHumanAuthority: false, enabledInV1AutoChain: true, notes: "Writes proposal rows only. Does not create claims." },
  { action: "refine_investigation_plan", automaticWhenPreconditionsMet: true, requiresHumanAuthority: false, enabledInV1AutoChain: true, notes: "Persists a plan from existing proposals. Does not overwrite proposals." },
  { action: "open_investigation_review_task", automaticWhenPreconditionsMet: true, requiresHumanAuthority: false, enabledInV1AutoChain: true, notes: "Surfaces the human gate. Does not acknowledge it." },
  { action: "evaluate_evidence_intelligence", automaticWhenPreconditionsMet: true, requiresHumanAuthority: false, enabledInV1AutoChain: false, notes: "Read-only. Queue already computes EI. v1 does not mutate from it." },
  { action: "build_evidence_gap_radar", automaticWhenPreconditionsMet: true, requiresHumanAuthority: false, enabledInV1AutoChain: false, notes: "Part of Evidence Intelligence. Read-only." },
  { action: "build_decision_dna", automaticWhenPreconditionsMet: true, requiresHumanAuthority: false, enabledInV1AutoChain: false, notes: "Part of Evidence Intelligence. Read-only." },
  { action: "construct_research_plan", automaticWhenPreconditionsMet: true, requiresHumanAuthority: false, enabledInV1AutoChain: false, notes: "Calls existing research planner. v1 does not execute discovery." },
  { action: "run_bounded_live_discovery", automaticWhenPreconditionsMet: true, requiresHumanAuthority: false, enabledInV1AutoChain: false, notes: "Existing Brave limits still apply. Not auto-chained in v1." },
  { action: "classify_rank_candidates", automaticWhenPreconditionsMet: true, requiresHumanAuthority: false, enabledInV1AutoChain: false, notes: "Existing discovery ranking. Live candidates are not evidence." },
  { action: "calculate_content_intelligence", automaticWhenPreconditionsMet: true, requiresHumanAuthority: false, enabledInV1AutoChain: false, notes: "Downstream of accepted evidence. Not auto-chained in v1." },
  { action: "generate_firewall_governed_drafts", automaticWhenPreconditionsMet: true, requiresHumanAuthority: false, enabledInV1AutoChain: false, notes: "Draft Claim Firewall remains mandatory. Not auto-chained in v1." },
  { action: "calculate_learning_signals", automaticWhenPreconditionsMet: true, requiresHumanAuthority: false, enabledInV1AutoChain: false, notes: "First-party learning only. Not auto-chained in v1." },
  { action: "acknowledge_investigation_plan", automaticWhenPreconditionsMet: false, requiresHumanAuthority: true, enabledInV1AutoChain: false, notes: "Human review of the refined plan. Does not create claims." },
  { action: "create_claims_from_proposals", automaticWhenPreconditionsMet: false, requiresHumanAuthority: true, enabledInV1AutoChain: false, notes: "v1 keeps claim-row creation behind human Select/Create." },
  { action: "accept_corpus_evidence", automaticWhenPreconditionsMet: false, requiresHumanAuthority: true, enabledInV1AutoChain: false, notes: "Corpus acceptance remains the truth boundary." },
  { action: "approve_package", automaticWhenPreconditionsMet: false, requiresHumanAuthority: true, enabledInV1AutoChain: false, notes: "Existing approval records. Operator cannot write them." },
  { action: "publish", automaticWhenPreconditionsMet: false, requiresHumanAuthority: true, enabledInV1AutoChain: false, notes: "SOCIAL_PUBLISH_AVAILABLE remains false." },
];

export type OperatorPrimaryAction = {
  id: "prepare_investigation" | "review_investigation_plan" | "create_claims" | "continue_evidence_research" | "review_evidence" | "reassess" | "generate_governed_draft" | "approve_package" | "complete";
  label: string;
  automatic: boolean;
  requiresHumanAuthority: boolean;
};

export type OperatorSummary = {
  headline: string;
  materialQuestionCount: number;
  safetySensitiveCount: number;
  verifiedFactCount: number;
  researchStatus: string;
  humanAction: string | null;
};

export type OperatorTransitionStep = {
  id: string;
  fromState: OperatorState;
  toState: OperatorState;
  action: string;
  automatic: boolean;
  requiresHumanAuthority: boolean;
  skipped: boolean;
  reason: string;
};

export type OperatorSnapshotInput = {
  packageId: string | null;
  hasPackage: boolean;
  proposalCount: number;
  claimCount: number;
  currentFingerprint: string | null;
  plan: {
    packageFingerprint: string;
    state: string;
    items: InvestigationItem[];
    rawProposalIds: string[];
  } | null;
  openTasks: Array<{ kind: string; state: string }>;
  verifiedFactCount: number;
  unresolvedContradiction: boolean;
  awaitingCorpusReviewCount: number;
  researchRunCount: number;
  researchInProgress: boolean;
  contentAuthorized: boolean;
  packageApproved: boolean;
};

export function isOperatorState(value: string): value is OperatorState {
  return (OPERATOR_STATES as readonly string[]).includes(value);
}

export function isOperatorAction(value: string): value is OperatorAction {
  return (OPERATOR_ACTIONS as readonly string[]).includes(value);
}

export function assertOperatorActionAllowed(action: string) {
  if ((FORBIDDEN_OPERATOR_ACTIONS as readonly string[]).includes(action)) {
    throw new Error(`Autonomous Operator cannot perform ${action}. That action requires explicit human authority.`);
  }
  if (action === "publish" || SOCIAL_PUBLISH_AVAILABLE !== false) {
    if (action === "publish") throw new Error("Autonomous Operator cannot publish. Publishing is disabled.");
  }
}

export function classifyOperatorState(input: OperatorSnapshotInput): OperatorState {
  assertNoEconomicsRankingFields(input as unknown as Record<string, unknown>);
  if (!input.hasPackage || !input.packageId) return "intake";
  if (input.claimCount === 0) return classifyPreClaim(input);
  if (input.unresolvedContradiction) return "evidence_reassessment";
  if (input.awaitingCorpusReviewCount > 0) return "corpus_review_required";
  if (input.researchInProgress) return "researching";
  if (input.verifiedFactCount === 0 && input.researchRunCount === 0) return "evidence_gaps";
  if (input.verifiedFactCount === 0) return "research_ready";
  if (!input.contentAuthorized) return "content_blocked";
  if (!input.packageApproved) return "content_ready";
  return SOCIAL_PUBLISH_AVAILABLE === false ? "complete_for_current_authority" : "human_approval_required";
}

function classifyPreClaim(input: OperatorSnapshotInput): OperatorState {
  if (input.proposalCount === 0) return "decomposition_needed";
  const planMatches = Boolean(input.plan && input.currentFingerprint && input.plan.packageFingerprint === input.currentFingerprint);
  if (!planMatches) return "refinement_needed";
  if (input.plan?.state === "awaiting_review" || input.openTasks.some((task) => task.kind === "investigation_plan" && task.state === "open")) {
    return "investigation_review";
  }
  if (input.claimCount === 0) return "claims_needed";
  return "package_ready";
}

export function primaryOperatorAction(state: OperatorState): OperatorPrimaryAction {
  if (state === "decomposition_needed" || state === "refinement_needed" || state === "package_ready") {
    return { id: "prepare_investigation", label: "Prepare investigation", automatic: true, requiresHumanAuthority: false };
  }
  if (state === "investigation_review") {
    return { id: "review_investigation_plan", label: "Review investigation plan", automatic: false, requiresHumanAuthority: true };
  }
  if (state === "claims_needed") {
    return { id: "create_claims", label: "Create claims from investigation", automatic: false, requiresHumanAuthority: true };
  }
  if (state === "evidence_gaps" || state === "research_ready") {
    return { id: "continue_evidence_research", label: "Continue evidence research", automatic: false, requiresHumanAuthority: false };
  }
  if (state === "corpus_review_required") {
    return { id: "review_evidence", label: "Review evidence", automatic: false, requiresHumanAuthority: true };
  }
  if (state === "evidence_reassessment") {
    return { id: "reassess", label: "Reassess", automatic: false, requiresHumanAuthority: true };
  }
  if (state === "content_blocked" || state === "content_ready") {
    return { id: "generate_governed_draft", label: "Generate governed draft", automatic: false, requiresHumanAuthority: false };
  }
  if (state === "human_approval_required") {
    return { id: "approve_package", label: "Approve final package", automatic: false, requiresHumanAuthority: true };
  }
  if (state === "complete_for_current_authority") {
    return { id: "complete", label: "Complete for current authority", automatic: false, requiresHumanAuthority: true };
  }
  return { id: "prepare_investigation", label: "Prepare investigation", automatic: true, requiresHumanAuthority: false };
}

export function buildOperatorSummary(input: OperatorSnapshotInput & { state: OperatorState }): OperatorSummary {
  const items = input.plan ? materialInvestigationItems(input.plan) : [];
  const materialQuestionCount = items.length;
  const safetySensitiveCount = items.filter((item) => item.safetySensitive).length;
  const human = primaryOperatorAction(input.state);
  const headline = headlineFor(input.state, Boolean(input.plan));
  const researchStatus = input.researchInProgress
    ? "Evidence research is in progress."
    : input.researchRunCount > 0
      ? `${input.researchRunCount} research run${input.researchRunCount === 1 ? "" : "s"} recorded. Live candidates are not evidence.`
      : "Evidence research has not started";
  return {
    headline,
    materialQuestionCount,
    safetySensitiveCount,
    verifiedFactCount: input.verifiedFactCount,
    researchStatus,
    humanAction: human.requiresHumanAuthority ? human.label : null,
  };
}

function headlineFor(state: OperatorState, hasPlan: boolean) {
  if (state === "decomposition_needed" || (state === "package_ready" && !hasPlan)) return "Investigation preparation is needed";
  if (state === "refinement_needed") return "Investigation refinement is needed";
  if (state === "investigation_review") return "Investigation prepared";
  if (state === "claims_needed") return "Investigation acknowledged. Claims are not created yet.";
  if (state === "corpus_review_required") return "Corpus review is required";
  if (state === "evidence_reassessment") return "Unresolved contradiction requires reassessment";
  if (state === "complete_for_current_authority") return "Complete for current authority";
  if (state === "human_approval_required") return "Human approval is required";
  return "Operator is waiting on current package state";
}

export function investigationReviewTaskCopy(packageId: string, materialCount: number, safetyCount: number) {
  return {
    kind: "investigation_plan" as const,
    decisionRequired: "Review the refined investigation plan. Confirm the material questions are the right ones to evidence. This does not create claims.",
    whyAutomationStopped: "Claim-row creation stays behind human review in Autonomous Operator v1.",
    approveConsequence: "The plan is acknowledged. Claims are still not created. Research still does not start.",
    rejectConsequence: "The plan stays open. Raw proposals remain intact for another refinement after package edits.",
    originatingPackageId: packageId,
    context: {
      materialQuestionCount: materialCount,
      safetySensitiveCount: safetyCount,
    },
  };
}

export function v1AutomaticActionsFor(state: OperatorState): string[] {
  if (state === "decomposition_needed" || state === "package_ready") return ["generate_claim_proposals", "refine_investigation_plan", "open_investigation_review_task"];
  if (state === "refinement_needed") return ["refine_investigation_plan", "open_investigation_review_task"];
  return [];
}

export function operatorViewFromRecords(input: OperatorSnapshotInput & {
  investigationPlan: { id: string; packageId: string; packageFingerprint: string; state: string; items: InvestigationItem[]; rawProposalIds: string[]; generatedAt?: string } | null;
  humanReviewTasks: Array<{ id: string; packageId: string; taskKind: string; state: string; decisionRequired: string; whyAutomationStopped: string; approveConsequence: string; rejectConsequence: string }>;
  latestRun: { id: string; fromState: string; toState: string; stoppedReason: string; stepCount: number } | null;
}) {
  const state = classifyOperatorState(input);
  return {
    version: OPERATOR_VERSION,
    publishingEnabled: SOCIAL_PUBLISH_AVAILABLE,
    packageId: input.packageId,
    state,
    summary: buildOperatorSummary({ ...input, state }),
    primaryAction: primaryOperatorAction(state),
    investigationPlan: input.investigationPlan,
    humanReviewTasks: input.humanReviewTasks,
    latestRun: input.latestRun,
  };
}

