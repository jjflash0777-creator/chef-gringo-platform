export const SOCIAL_GROWTH_ID_KINDS = [
  "opportunity",
  "package",
  "claim",
  "asset",
  "variant",
  "approval",
  "destination",
  "publication",
  "evidence-request",
  "claim-evidence",
] as const;

export type SocialGrowthIdKind = typeof SOCIAL_GROWTH_ID_KINDS[number];

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ID_PATTERN = /^sgo:(opportunity|package|claim|asset|variant|approval|destination|publication|evidence-request|claim-evidence):[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeSocialSlug(value: string) {
  const slug = value.trim().toLowerCase();
  if (!slug || slug.length > 80 || !SLUG_PATTERN.test(slug)) {
    throw new Error("Social Growth identifiers require a lowercase kebab slug of 1–80 characters.");
  }
  return slug;
}

export function socialGrowthId(kind: SocialGrowthIdKind, slug: string) {
  if (!SOCIAL_GROWTH_ID_KINDS.includes(kind)) throw new Error("Unsupported Social Growth identifier kind.");
  return `sgo:${kind}:${normalizeSocialSlug(slug)}`;
}

export function parseSocialGrowthId(value: string) {
  if (!ID_PATTERN.test(value)) throw new Error("Social Growth identifier is not canonical.");
  const [, kind, slug] = value.split(":");
  return { kind: kind as SocialGrowthIdKind, slug };
}

export function assertSocialGrowthId(kind: SocialGrowthIdKind, value: string) {
  const parsed = parseSocialGrowthId(value);
  if (parsed.kind !== kind) throw new Error(`Expected a ${kind} identifier.`);
  return parsed;
}

export function isSocialGrowthId(kind: SocialGrowthIdKind, value: string) {
  try {
    assertSocialGrowthId(kind, value);
    return true;
  } catch {
    return false;
  }
}
