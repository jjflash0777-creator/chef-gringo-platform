import type { CommercialLinkKind } from "../../marketplace/commercial-links.ts";
import type { WorkflowId } from "../../marketplace/catalog.ts";
import type { ResearchCapability } from "../research/capability.ts";

/**
 * Canonical Ask Chef Gringo contract.
 *
 * One request/response shape for every public surface. Evidence from a later
 * bounded-research engine can attach to `evidence[]` without changing callers.
 * Private reasoning never belongs here.
 */

export const ASSISTANT_INTENTS = [
  "culinary_technique",
  "recipe_help",
  "ingredient_substitution",
  "food_safety",
  "dietary_accommodation",
  "equipment_selection",
  "equipment_troubleshooting",
  "software_operations",
  "food_cost_labor",
  "sourcing",
  "business_startup",
  "marketplace_comparison",
  "general",
] as const;

export type AssistantIntent = typeof ASSISTANT_INTENTS[number];

export type AssistantConfidence = "high" | "medium" | "low";

export type ConversationTurn = { role: "user" | "assistant"; content: string };

export type PhotoMetadata = {
  name: string;
  mimeType: string;
  sizeBytes: number;
};

export type AssistantRequest = {
  question: string;
  intent?: AssistantIntent;
  conversation?: ConversationTurn[];
  photo?: PhotoMetadata | null;
  location?: string | null;
  budget?: string | null;
  operatingContext?: string | null;
  dietaryContext?: string | null;
  source?: string;
};

export type EvidenceKind = "sourced" | "practice" | "judgment" | "unavailable";

export type AssistantEvidence = {
  kind: EvidenceKind;
  label: string;
  url?: string;
  claim?: string;
  authorityLabel?: "official source" | "professional practice" | "judgment" | "unavailable support";
};

export type AssistantSourceUsed = {
  title: string;
  organization: string;
  dateLabel: string;
  jurisdiction?: string;
  why: string;
  url?: string;
};

export type AssistantSafety = {
  level: "note" | "escalate";
  topic: string;
  text: string;
};

export type AssistantNextAction = {
  id: string;
  label: string;
  description?: string;
  prompt?: string;
  href?: string;
  kind?: "continue" | "investigate" | "marketplace" | "knowledge" | "external";
};

export type AssistantCommercialRoute = {
  productId: string;
  name: string;
  manufacturer: string;
  bestFor: string;
  whySuggested: string;
  priceContext: string;
  evidenceLabel: string;
  evidenceUrl: string;
  commercialKind: CommercialLinkKind;
  monetized: boolean;
  href: string | null;
  rel: string | null;
  note: string | null;
  workflowId: WorkflowId;
};

export type AssistantCommercialBlock = {
  eligible: boolean;
  disclosureRequired: boolean;
  routes: AssistantCommercialRoute[];
};

export const ASSISTANT_ERROR_CODES = [
  "empty_question",
  "oversized_input",
  "invalid_json",
  "missing_configuration",
  "timeout",
  "malformed_response",
  "empty_response",
  "network_failure",
  "rate_limited",
  "unsupported_photo",
  "server_error",
] as const;

export type AssistantErrorCode = typeof ASSISTANT_ERROR_CODES[number];

export type AssistantError = {
  code: AssistantErrorCode;
  message: string;
  retryable: boolean;
  httpStatus: number;
};

export type AssistantResponse = {
  status: "answered" | "needs_clarification" | "error";
  intent: AssistantIntent;
  answer: string;
  explanation?: string;
  clarifyingQuestion?: string;
  nextActions: AssistantNextAction[];
  assumptions: string[];
  confidence: AssistantConfidence;
  evidence: AssistantEvidence[];
  researchCapability: ResearchCapability;
  sourcesUsed: AssistantSourceUsed[];
  safety: AssistantSafety | null;
  commercial: AssistantCommercialBlock | null;
  error: AssistantError | null;
};

export const QUESTION_MAX_CHARS = 12_000;
export const PHOTO_MAX_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export const PUBLIC_ERROR_MESSAGES: Record<AssistantErrorCode, string> = {
  empty_question: "A few words are enough to start. Tell Chef Gringo what you are working on.",
  oversized_input: "That question is too long to handle in one pass. Shorten it and try again.",
  invalid_json: "Chef Gringo could not read that request. Try sending it again.",
  missing_configuration: "Live assistant replies are not configured on this environment. Nothing was guessed.",
  timeout: "Chef Gringo timed out before finishing. Your question is still here — retry when you are ready.",
  malformed_response: "Chef Gringo returned something that could not be used. Retry, or rephrase the question.",
  empty_response: "Chef Gringo came back empty. Retry, or try a more specific question.",
  network_failure: "The connection dropped before Chef Gringo finished. Your question is still here.",
  rate_limited: "Too many questions just now. Wait a moment and retry.",
  unsupported_photo: "That file is not a supported photo. Use JPEG, PNG, WebP, or HEIC, or continue without a photo.",
  server_error: "Something went wrong on Chef Gringo’s side. Your question was not lost — retry.",
};
