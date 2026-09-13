import { applyValidationOverride, isPubliclyCitable, urlAloneIsNotEvidence, type ResearchEvidenceItem, type ValidationOverride } from "./evidence.ts";
import { PRODUCTION_EVIDENCE, TEST_ONLY_EVIDENCE } from "./seed-evidence.ts";
import { RESEARCH_LIMITS } from "./limits.ts";

export type EvidenceRepositoryOptions = {
  includeTestFixtures?: boolean;
};

function catalog(options: EvidenceRepositoryOptions = {}) {
  return options.includeTestFixtures ? [...PRODUCTION_EVIDENCE, ...TEST_ONLY_EVIDENCE] : PRODUCTION_EVIDENCE;
}

export function listRepositoryEvidence(options: EvidenceRepositoryOptions = {}) {
  return catalog(options).slice(0, RESEARCH_LIMITS.maximumEvidenceItems * 4);
}

export function getRepositoryEvidence(id: string, options: EvidenceRepositoryOptions = {}) {
  return catalog(options).find((item) => item.id === id) ?? null;
}

function relevantToQuestion(item: ResearchEvidenceItem, question: string) {
  const text = question.toLowerCase();
  const topicHit = item.topics.some((topic) => text.includes(topic));
  if (!topicHit) return false;
  if (/\b(price|pricing|cost|stock|availability|amazon|today)\b/i.test(text) && !item.topics.some((topic) => /price|availability/.test(topic))) {
    return false;
  }
  return true;
}

export function findRepositoryEvidence(question: string, options: EvidenceRepositoryOptions = {}) {
  const text = question.toLowerCase();
  const scored = catalog(options)
    .filter((item) => relevantToQuestion(item, question))
    .map((item) => ({
      item,
      score: item.topics.reduce((sum, topic) => sum + (text.includes(topic) ? topic.length : 0), 0),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.item.authorityTier - right.item.authorityTier);
  return scored.slice(0, RESEARCH_LIMITS.maximumEvidenceItems).map((entry) => entry.item);
}

export function productionEvidenceForPublic(question: string) {
  return findRepositoryEvidence(question, { includeTestFixtures: false }).filter((item) => isPubliclyCitable(item) && !urlAloneIsNotEvidence(item));
}

export function contradictoryEvidence(options: EvidenceRepositoryOptions = {}) {
  const items = catalog(options).filter((item) => item.topics.includes("conflict-demo"));
  return items;
}

export function recordOverride(item: ResearchEvidenceItem, override: ValidationOverride) {
  return applyValidationOverride(item, override);
}
