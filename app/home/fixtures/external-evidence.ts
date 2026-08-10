import type { ExternalEvidenceInput } from "../external-evidence.ts";

const extractedAt = "2026-08-10T15:00:00.000Z";

export const matchingDataPlate: ExternalEvidenceInput = {
  fileName: "synthetic-matching-data-plate.txt",
  mediaType: "plain_text",
  sourceType: "data_plate_image",
  sourceLocation: "synthetic data plate front",
  extractedAt,
  contentText: "Manufacturer: Example Refrigeration Co.\nModel: CG-WIF-230\nSerial: SYN-001\nVoltage: 208-230V\nPhase: 3",
};

export const conflictingDataPlate: ExternalEvidenceInput = {
  ...matchingDataPlate,
  fileName: "synthetic-conflicting-data-plate.txt",
  contentText: "Manufacturer: Example Refrigeration Co.\nModel: CG-WIF-230X\nSerial: SYN-001\nVoltage: 208-230V\nPhase: 3",
};

export const technicianReport: ExternalEvidenceInput = {
  fileName: "synthetic-technician-report.txt",
  mediaType: "plain_text",
  sourceType: "technician_report",
  sourceLocation: "service note 1",
  extractedAt,
  contentText: "Technician: A. Example\nCompany: Synthetic Service Co.\nVisit date: 2026-08-09\nObserved: compressor did not start during visit\nDiagnosis: compressor failure\nRecommended next action: verify winding readings and quote replacement",
};

export const incompleteDistributorQuote: ExternalEvidenceInput = {
  fileName: "synthetic-incomplete-quote.txt",
  mediaType: "plain_text",
  sourceType: "distributor_quote",
  sourceLocation: "quote page 1",
  extractedAt,
  contentText: "Quoted product: Synthetic WIF replacement\nBase price: $8,000.00\nTax: $0.00\nQuote date: 2026-08-10",
};

export const manufacturerManual: ExternalEvidenceInput = {
  fileName: "synthetic-manufacturer-manual.txt",
  mediaType: "plain_text",
  sourceType: "manufacturer_documentation",
  sourceLocation: "page 14",
  extractedAt,
  contentText: "Applicable model: CG-WIF-230\nElectrical requirement: 208-230V\nPhase: 3\nInstallation constraint: qualified electrician required",
};

export const sellerListing: ExternalEvidenceInput = {
  fileName: "synthetic-seller-listing.txt",
  mediaType: "plain_text",
  sourceType: "seller_listing",
  sourceLocation: "public listing text",
  extractedAt,
  contentText: "Compatibility: seller claims part fits CG-WIF-230",
};
