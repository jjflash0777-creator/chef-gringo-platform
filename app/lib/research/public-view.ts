import type { AssistantEvidence, EvidenceKind } from "../ai/assistant-contract.ts";
import type { ResearchCapability } from "./capability.ts";
import type { ResearchEvidenceItem } from "./evidence.ts";
import { isPubliclyCitable } from "./evidence.ts";

export type PublicEvidenceView = AssistantEvidence & {
  claim?: string;
  authorityLabel: "official source" | "professional practice" | "judgment" | "unavailable support";
};

function kindFor(item: ResearchEvidenceItem): EvidenceKind {
  if (item.sourceType === "professional_practice") return "practice";
  if (item.sourceType === "chef_gringo_judgment") return "judgment";
  if (item.validationStatus === "identified" || item.authorityTier === 1) return "sourced";
  return "sourced";
}

function authorityLabel(item: ResearchEvidenceItem): PublicEvidenceView["authorityLabel"] {
  if (item.sourceType === "professional_practice") return "professional practice";
  if (item.sourceType === "chef_gringo_judgment") return "judgment";
  if (item.authorityTier === 1) return "official source";
  return "professional practice";
}

export function toPublicEvidence(item: ResearchEvidenceItem): PublicEvidenceView | null {
  if (!isPubliclyCitable(item)) return null;
  const label = item.authorityTier === 1
    ? `${item.sourceOrganization} — ${item.title}`
    : item.sourceType === "professional_practice"
      ? "Standard culinary practice — not a live source check"
      : item.title;
  return {
    kind: kindFor(item),
    label,
    url: item.sourceUrl ?? undefined,
    claim: item.claimSupported ?? undefined,
    authorityLabel: authorityLabel(item),
  };
}

export function publicEvidenceFromRepository(items: ResearchEvidenceItem[]): PublicEvidenceView[] {
  return items.flatMap((item) => {
    const view = toPublicEvidence(item);
    return view ? [view] : [];
  });
}

export function limitationFor(capability: ResearchCapability, hadHits: boolean) {
  if (capability === "research_unavailable" || !hadHits && capability !== "knowledge_only") {
    return "Chef Gringo does not have a retrieved, validated source for this. The answer stays conservative.";
  }
  if (capability === "bounded_research_plan") {
    return "A research plan exists. Sources were not fetched, so nothing here is a live finding.";
  }
  return null;
}
