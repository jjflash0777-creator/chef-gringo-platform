import { SOCIAL_PUBLISH_AVAILABLE } from "./types.ts";
import { assertNoEconomicsRankingFields } from "./commercial.ts";
import { materialInvestigationItems, type InvestigationItem } from "./investigation-refinement.ts";

/**
 * Autonomous Operator v2. Orchestrates permitted operations through claim
 * creation and bounded evidence research. Does not accept evidence, approve
 * packages, or publish.
 */
export const OPERATOR_VERSION = "autonomous-operator-v2";
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
  "research_incomplete",
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
  "review_investigation_plan",
  "acknowledge_investigation_plan",
  "reject_investigation_plan",
  "create_claims_from_investigation",
  "continue_evidence_research",
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
  { action: "evaluate_evidence_intelligence", automaticWhenPreconditionsMet: true, requiresHumanAuthority: false, enabledInV1AutoChain: false, notes: "Read-only. Queue already computes EI. Auto-invoked after v2 claim creation; still not a second sufficiency engine." },
  { action: "build_evidence_gap_radar", automaticWhenPreconditionsMet: true, requiresHumanAuthority: false, enabledInV1AutoChain: false, notes: "Part of Evidence Intelligence. Read-only." },
  { action: "build_decision_dna", automaticWhenPreconditionsMet: true, requiresHumanAuthority: false, enabledInV1AutoChain: false, notes: "Part of Evidence Intelligence. Read-only." },
  { action: "construct_research_plan", automaticWhenPreconditionsMet: true, requiresHumanAuthority: false, enabledInV1AutoChain: false, notes: "Calls existing research planner. Auto-chained in v2 after human claim authorization." },
  { action: "run_bounded_live_discovery", automaticWhenPreconditionsMet: true, requiresHumanAuthority: false, enabledInV1AutoChain: false, notes: "Existing Brave 3/10/5/8s limits remain hard ceilings. Operator budget may be stricter." },
  { action: "classify_rank_candidates", automaticWhenPreconditionsMet: true, requiresHumanAuthority: false, enabledInV1AutoChain: false, notes: "Existing discovery ranking. Live candidates are not evidence." },
  { action: "submit_policy_advancing_candidates_for_review", automaticWhenPreconditionsMet: true, requiresHumanAuthority: false, enabledInV1AutoChain: false, notes: "Submits to awaiting_review only. Never accepts corpus evidence." },
  { action: "calculate_content_intelligence", automaticWhenPreconditionsMet: true, requiresHumanAuthority: false, enabledInV1AutoChain: false, notes: "Downstream of accepted evidence. Not auto-chained in v1." },
  { action: "generate_firewall_governed_drafts", automaticWhenPreconditionsMet: true, requiresHumanAuthority: false, enabledInV1AutoChain: false, notes: "Draft Claim Firewall remains mandatory. Not auto-chained in v1." },
  { action: "calculate_learning_signals", automaticWhenPreconditionsMet: true, requiresHumanAuthority: false, enabledInV1AutoChain: false, notes: "First-party learning only. Not auto-chained in v1." },
  { action: "acknowledge_investigation_plan", automaticWhenPreconditionsMet: false, requiresHumanAuthority: true, enabledInV1AutoChain: false, notes: "Human review of the refined plan. Does not create claims." },
  { action: "create_claims_from_proposals", automaticWhenPreconditionsMet: false, requiresHumanAuthority: true, enabledInV1AutoChain: false, notes: "Manual Select/Create remains available as the audit surface. Operator v2 uses create_claims_from_investigation." },
  { action: "create_claims_from_investigation", automaticWhenPreconditionsMet: false, requiresHumanAuthority: true, enabledInV1AutoChain: false, notes: "Human authorization to create unevidenced claims from the current acknowledged plan, then auto-chain permitted research until the next human gate." },
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
  claimCount: number;
  awaitingCorpusReviewCount: number;
  unresearchedGapCount: number;
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
  details?: Record<string, unknown>;
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
  unresearchedGapCount?: number;
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
  if (input.proposalCount === 0) return "decomposition_needed";
  const planMatches = Boolean(input.plan && input.currentFingerprint && input.plan.packageFingerprint === input.currentFingerprint);
  if (!planMatches) return "refinement_needed";
  if (input.plan?.state === "awaiting_review" || input.openTasks.some((task) => task.kind === "investigation_plan" && task.state === "open")) {
    return "investigation_review";
  }
  if (input.claimCount === 0) return "claims_needed";
  if (input.unresolvedContradiction) return "evidence_reassessment";
  if (input.awaitingCorpusReviewCount > 0) return "corpus_review_required";
  if (input.researchInProgress) return "researching";
  if (input.verifiedFactCount === 0 && input.researchRunCount === 0) return "evidence_gaps";
  if (input.verifiedFactCount === 0 && (input.unresearchedGapCount ?? 0) > 0) return "research_incomplete";
  if (input.verifiedFactCount === 0) return "research_ready";
  if (!input.contentAuthorized) return "content_blocked";
  if (!input.packageApproved) return "content_ready";
  return SOCIAL_PUBLISH_AVAILABLE === false ? "complete_for_current_authority" : "human_approval_required";
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
  if (state === "evidence_gaps" || state === "research_ready" || state === "research_incomplete") {
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
    : input.awaitingCorpusReviewCount > 0
      ? `${input.awaitingCorpusReviewCount} candidate${input.awaitingCorpusReviewCount === 1 ? "" : "s"} awaiting corpus review. Live candidates are not evidence.`
      : input.state === "research_incomplete"
        ? "Research budget exhausted. Remaining gaps are unresolved. Live candidates are not evidence."
        : input.researchRunCount > 0
          ? `${input.researchRunCount} research run${input.researchRunCount === 1 ? "" : "s"} recorded. Live candidates are not evidence.`
          : input.claimCount > 0
            ? "Claims exist without accepted evidence. Evidence research has not started."
            : "Evidence research has not started";
  return {
    headline,
    materialQuestionCount,
    safetySensitiveCount,
    verifiedFactCount: input.verifiedFactCount,
    claimCount: input.claimCount,
    awaitingCorpusReviewCount: input.awaitingCorpusReviewCount,
    unresearchedGapCount: input.unresearchedGapCount ?? 0,
    researchStatus,
    humanAction: human.requiresHumanAuthority || human.id === "continue_evidence_research" ? human.label : null,
  };
}

function headlineFor(state: OperatorState, hasPlan: boolean) {
  if (state === "decomposition_needed" || (state === "package_ready" && !hasPlan)) return "Investigation preparation is needed";
  if (state === "refinement_needed") return "Investigation refinement is needed";
  if (state === "investigation_review") return "Investigation prepared";
  if (state === "claims_needed") return "Investigation acknowledged. Claims are not created yet.";
  if (state === "evidence_gaps") return "Claims created. Evidence Intelligence found unresolved gaps.";
  if (state === "research_incomplete") return "Research budget exhausted";
  if (state === "corpus_review_required") return "Evidence review required";
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

export function corpusReviewTaskCopy(packageId: string, candidateCount: number, claimLabels: string[]) {
  const claims = claimLabels.slice(0, 4).join("; ") || "the current package claims";
  return {
    kind: "corpus_candidates" as const,
    decisionRequired: `Review ${candidateCount} policy-advancing candidate${candidateCount === 1 ? "" : "s"} in corpus review. Accepting is a separate human decision.`,
    whyAutomationStopped: "Live candidates are not evidence. Corpus acceptance remains the truth boundary.",
    approveConsequence: "Human corpus acceptance may later attach evidence. Autonomous Operator does not accept, approve, or publish.",
    rejectConsequence: "Rejected candidates stay out of accepted evidence. Remaining gaps can be researched later.",
    originatingPackageId: packageId,
    context: {
      candidateCount,
      affectedClaims: claimLabels,
      claimsPreview: claims,
    },
  };
}

export function contradictionReviewTaskCopy(packageId: string, claimLabel: string, sourceLabel: string) {
  return {
    kind: "contradiction" as const,
    decisionRequired: `A discovered source appears to contradict “${claimLabel}”. Human judgment is required before further automation.`,
    whyAutomationStopped: "Contradiction handling cannot be weakened. Operator does not resolve conflicts automatically.",
    approveConsequence: "A human may accept, reject, or investigate the contradicting source in corpus review.",
    rejectConsequence: "The contradiction remains unresolved. Recommendation readiness stays blocked.",
    originatingPackageId: packageId,
    context: {
      claimLabel,
      sourceLabel,
    },
  };
}

export function operatorRequestForPrimaryAction(primary: OperatorPrimaryAction): OperatorAction | "advance" {
  if (primary.id === "review_investigation_plan") return "acknowledge_investigation_plan";
  if (primary.id === "create_claims") return "create_claims_from_investigation";
  if (primary.id === "continue_evidence_research") return "continue_evidence_research";
  return "advance";
}

export function isInvestigationReviewAcknowledgment(action: string) {
  return action === "acknowledge_investigation_plan" || action === "review_investigation_plan";
}

export function isClaimsFromInvestigationAuthorization(action: string) {
  return action === "create_claims_from_investigation";
}

export function isEvidenceResearchContinuation(action: string) {
  return action === "continue_evidence_research";
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

