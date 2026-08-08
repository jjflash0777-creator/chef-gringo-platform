"use server";

import { requireMarketplaceAdministrator } from "../../../marketplace-authorization";
import { validateDecisionCaseInput } from "../../../marketplace/intelligence/case-input-validation";
import { evaluateDecisionCase } from "../../../marketplace/intelligence/decision-case-service";

export async function analyzeIntelligenceCase(input: unknown) {
  await requireMarketplaceAdministrator("/admin/marketplace/intelligence");
  const validation = validateDecisionCaseInput(input);
  if (!validation.ok) return validation;
  return { ok: true as const, result: evaluateDecisionCase(validation.value) };
}
