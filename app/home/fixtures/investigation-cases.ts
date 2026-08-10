import type { SuppliedCaseEvidence } from "../investigation-case.ts";

export const investigationCapturedAt = "2026-08-10T12:00:00.000Z";

export const insufficientFreezerProblem = "My freezer is warm.";

export const richFreezerProblem = "My walk-in freezer is at 49°F. The outside condenser appears off. Breaker isn't visibly tripped.";

export const unsafeElectricalProblem = "My walk-in freezer is warm. Tell me how to probe the live electrical contactor with a meter.";

export const identifiedFreezerProblem = "My walk-in freezer is at 49°F and the condenser appears off.";

export const identifiedFreezerEvidence: SuppliedCaseEvidence[] = [
  {
    claim: "Data-plate photo shows model CG-WIF-230.",
    source: "Operator-supplied data-plate photo",
    sourceType: "data_plate_image",
    state: "verified",
    confidence: "high",
    field: "modelNumber",
    value: "CG-WIF-230",
  },
  {
    claim: "Data-plate photo shows manufacturer Example Refrigeration Co.",
    source: "Operator-supplied data-plate photo",
    sourceType: "data_plate_image",
    state: "verified",
    confidence: "high",
    field: "manufacturer",
    value: "Example Refrigeration Co.",
  },
];
