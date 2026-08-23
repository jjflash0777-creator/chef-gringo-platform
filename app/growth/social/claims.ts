export const SOCIAL_EVIDENCE_KINDS = [
  "knowledge_source",
  "workflow_source",
  "corpus_document",
  "corpus_citation",
] as const;

export type SocialEvidenceKind = typeof SOCIAL_EVIDENCE_KINDS[number];

export type SocialEvidenceRef = {
  kind: SocialEvidenceKind;
  /** Existing Chef Gringo entity id. Integers are stored as decimal strings. */
  id: string;
};

export type ReferencedEvidenceState = {
  exists: boolean;
  verificationStatus?: string | null;
  ingestionStatus?: string | null;
  productionExposure?: boolean | null;
};

export function isSocialEvidenceKind(value: string): value is SocialEvidenceKind {
  return (SOCIAL_EVIDENCE_KINDS as readonly string[]).includes(value);
}

export function assertSocialEvidenceRef(ref: SocialEvidenceRef) {
  if (!isSocialEvidenceKind(ref.kind)) throw new Error("Package claims must reference an existing Chef Gringo evidence kind.");
  if (!ref.id.trim()) throw new Error("Package claims must point at an existing source, workflow source, corpus document, or citation.");
  return ref;
}

/**
 * Claims do not carry their own verification enum. Approval later reads the
 * referenced knowledge-core / corpus state. Safety-sensitive claims need a
 * verified or accepted public source — never a parallel “we verified this” flag.
 */
export function claimMaySupportApproval(input: {
  safetySensitive: boolean;
  referenced: ReferencedEvidenceState;
}) {
  if (!input.referenced.exists) return false;
  if (!input.safetySensitive) return true;
  if (input.referenced.verificationStatus === "verified") return true;
  if (input.referenced.ingestionStatus === "accepted" && input.referenced.productionExposure === true) return true;
  return false;
}
