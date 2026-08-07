export const WORKFLOW_STATUSES = ["draft", "in_review", "published"] as const;
export type WorkflowStatus = typeof WORKFLOW_STATUSES[number];

export const RISK_LEVELS = ["low", "medium", "high"] as const;
export type RiskLevel = typeof RISK_LEVELS[number];

export const CONFIDENCE_RUBRIC = {
  insufficient: {
    label: "Insufficient",
    description: "The evidence or context is too weak to support publication.",
    minimumEvidence: "Record the gap; do not publish the guidance as a recommendation.",
  },
  low: {
    label: "Low",
    description: "Plausible guidance supported by limited or indirect evidence.",
    minimumEvidence: "At least one relevant verified source with prominent limitations.",
  },
  moderate: {
    label: "Moderate",
    description: "Relevant sources or credible operational evidence support the guidance, with material limitations.",
    minimumEvidence: "Verified evidence applicable to the workflow and step-level support for high-risk claims.",
  },
  high: {
    label: "High",
    description: "Converging authoritative or empirical and operational evidence applies directly to the target context.",
    minimumEvidence: "Multiple current, independent sources including authoritative or empirical support and applicable operational evidence.",
  },
} as const;

export type ConfidenceLevel = keyof typeof CONFIDENCE_RUBRIC;

export const SOURCE_TYPES = [
  "professional_standard",
  "manufacturer_documentation",
  "regulatory_guidance",
  "professional_organization_guidance",
  "direct_professional_experience",
  "editorial_judgment",
] as const;

export type SourceType = typeof SOURCE_TYPES[number];

export type WorkflowGateRecord = {
  title: string;
  slug: string;
  summary: string;
  problemStatement: string;
  jobStatement: string;
  intendedOutcome: string;
  nextAction: string;
  affiliateDisclosure: string;
  confidenceLevel: string;
  primaryPersonaId: number | null;
  primaryEnvironmentId: number | null;
  primaryUseCaseId: number | null;
  reviewerUserId: string | null;
  createdByUserId: string;
  lastVerifiedAt: string | null;
  reviewDueAt: string | null;
};

export type WorkflowGateStep = {
  id: number;
  position: number;
  title: string;
  instruction: string;
  purpose: string;
  expectedResult: string;
  measurableCheck: string;
  commonMistake: string;
  correctiveAction: string;
  riskLevel: string;
};

export type WorkflowGateSource = {
  workflowStepId: number | null;
  verificationStatus: string;
  verifiedByUserId: string | null;
  verifiedAt: string | null;
  confidenceLevel: string;
};

export type QualityGateFailure = {
  code: string;
  message: string;
  stepId?: number;
};

function blank(value: string | null | undefined) {
  return !value || !value.trim();
}

export function evaluateWorkflowQualityGates(
  workflow: WorkflowGateRecord,
  steps: WorkflowGateStep[],
  sourceLinks: WorkflowGateSource[],
): QualityGateFailure[] {
  const failures: QualityGateFailure[] = [];
  const requiredText: Array<[keyof WorkflowGateRecord, string]> = [
    ["title", "Title"],
    ["slug", "Slug"],
    ["summary", "Summary"],
    ["problemStatement", "Problem statement"],
    ["jobStatement", "Job statement"],
    ["intendedOutcome", "Intended outcome"],
    ["nextAction", "Next action"],
    ["affiliateDisclosure", "Affiliate disclosure"],
  ];
  for (const [key, label] of requiredText) {
    if (blank(String(workflow[key] ?? ""))) failures.push({ code: `missing_${String(key)}`, message: `${label} is required.` });
  }
  if (!workflow.primaryPersonaId) failures.push({ code: "missing_persona", message: "Primary persona is required." });
  if (!workflow.primaryEnvironmentId) failures.push({ code: "missing_environment", message: "Primary environment is required." });
  if (!workflow.primaryUseCaseId) failures.push({ code: "missing_use_case", message: "Primary use case is required." });
  if (!(workflow.confidenceLevel in CONFIDENCE_RUBRIC) || workflow.confidenceLevel === "insufficient") {
    failures.push({ code: "insufficient_confidence", message: "A publishable confidence level is required." });
  }
  if (blank(workflow.reviewerUserId)) failures.push({ code: "missing_reviewer", message: "Reviewer is required." });
  if (workflow.reviewerUserId && workflow.reviewerUserId === workflow.createdByUserId) {
    failures.push({ code: "self_review", message: "The workflow author cannot approve this high-risk workflow." });
  }
  if (!workflow.lastVerifiedAt) failures.push({ code: "missing_verification_date", message: "Last verification date is required." });
  if (!workflow.reviewDueAt) failures.push({ code: "missing_review_due_date", message: "Review-due date is required." });
  if (steps.length === 0) failures.push({ code: "missing_steps", message: "At least one workflow step is required." });

  const positions = steps.map((step) => step.position);
  const expectedPositions = steps.map((_, index) => index + 1);
  if (new Set(positions).size !== positions.length || positions.some((position, index) => position !== expectedPositions[index])) {
    failures.push({ code: "invalid_step_positions", message: "Step positions must be unique and contiguous, starting at 1." });
  }

  for (const step of steps) {
    if (blank(step.title)) failures.push({ code: "missing_step_title", message: `Step ${step.position} needs a title.`, stepId: step.id });
    if (blank(step.instruction)) failures.push({ code: "missing_step_instruction", message: `Step ${step.position} needs an instruction.`, stepId: step.id });
    if (blank(step.purpose)) failures.push({ code: "missing_step_purpose", message: `Step ${step.position} needs a purpose.`, stepId: step.id });
    if (blank(step.expectedResult) && blank(step.measurableCheck)) {
      failures.push({ code: "missing_step_result", message: `Step ${step.position} needs an expected result or measurable check.`, stepId: step.id });
    }
    if (blank(step.commonMistake)) failures.push({ code: "missing_common_mistake", message: `Step ${step.position} needs a common mistake.`, stepId: step.id });
    if (step.riskLevel === "high") {
      if (blank(step.correctiveAction)) failures.push({ code: "missing_corrective_action", message: `High-risk step ${step.position} needs a corrective action.`, stepId: step.id });
      const hasVerifiedStepSource = sourceLinks.some((link) =>
        link.workflowStepId === step.id &&
        link.verificationStatus === "verified" &&
        Boolean(link.verifiedByUserId) &&
        Boolean(link.verifiedAt) &&
        link.confidenceLevel !== "insufficient"
      );
      if (!hasVerifiedStepSource) failures.push({ code: "missing_high_risk_source", message: `High-risk step ${step.position} needs verified step-level evidence.`, stepId: step.id });
    }
  }

  const hasVerifiedSource = sourceLinks.some((link) =>
    link.verificationStatus === "verified" &&
    Boolean(link.verifiedByUserId) &&
    Boolean(link.verifiedAt) &&
    link.confidenceLevel !== "insufficient"
  );
  if (!hasVerifiedSource) failures.push({ code: "missing_verified_source", message: "At least one verified source is required." });
  return failures;
}

export function canTransitionWorkflow(from: WorkflowStatus, to: WorkflowStatus) {
  const transitions: Record<WorkflowStatus, WorkflowStatus[]> = {
    draft: ["in_review"],
    in_review: ["draft", "published"],
    published: ["draft"],
  };
  return transitions[from].includes(to);
}

export function summarizeChanges(before: Record<string, unknown>, after: Record<string, unknown>) {
  const changed: Record<string, { before: unknown; after: unknown }> = {};
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) changed[key] = { before: before[key], after: after[key] };
  }
  return changed;
}
