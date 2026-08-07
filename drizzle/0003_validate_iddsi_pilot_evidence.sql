-- Editorial data migration only. No schema changes.
-- Sources were bibliographically checked on 2026-07-27 but remain draft pending qualified human verification.

INSERT INTO `sources` (`title`, `publisher`, `source_type`, `url`, `publication_date`, `accessed_at`, `verification_status`, `notes`)
SELECT
  'Complete IDDSI Framework: Detailed Definitions 2.0',
  'International Dysphagia Diet Standardisation Initiative',
  'professional_standard',
  'https://www.iddsi.org/images/Publications-Resources/DetailedDefnTestMethods/English/V2DetailedDefnEnglish31july2019.pdf',
  '2019-07-31',
  '2026-07-27',
  'draft',
  'Official IDDSI framework. Supports descriptors and test selection, not resident-specific prescription, facility compliance, or proof that a particular recipe passes.'
WHERE NOT EXISTS (SELECT 1 FROM `sources` WHERE `title` = 'Complete IDDSI Framework: Detailed Definitions 2.0' AND `publisher` = 'International Dysphagia Diet Standardisation Initiative');
--> statement-breakpoint
INSERT INTO `sources` (`title`, `publisher`, `source_type`, `url`, `publication_date`, `accessed_at`, `verification_status`, `notes`)
SELECT
  'Testing Methods for Use with the IDDSI Framework 2.0',
  'International Dysphagia Diet Standardisation Initiative',
  'professional_standard',
  'https://www.iddsi.org/images/Publications-Resources/DetailedDefnTestMethods/English/V2TestingMethodsEnglish31july2019.pdf',
  '2019-07-31',
  '2026-07-27',
  'draft',
  'Official testing-method document. Application must be verified by an IDDSI-competent reviewer and performed on the actual product at relevant service conditions.'
WHERE NOT EXISTS (SELECT 1 FROM `sources` WHERE `title` = 'Testing Methods for Use with the IDDSI Framework 2.0' AND `publisher` = 'International Dysphagia Diet Standardisation Initiative');
--> statement-breakpoint
INSERT INTO `sources` (`title`, `publisher`, `source_type`, `url`, `publication_date`, `accessed_at`, `verification_status`, `notes`)
SELECT
  'Level 4 Pureed Food for Adults',
  'International Dysphagia Diet Standardisation Initiative',
  'professional_organization_guidance',
  'https://www.iddsi.org/images/Publications-Resources/PatientHandouts/English/Adults/HR/4_pureed_adults_consumer_handout_30jan2019.pdf',
  '2019-01-30',
  '2026-07-27',
  'draft',
  'General adult handout. It directs readers to consult a health professional and does not replace a resident-specific order, complete framework, testing procedure, or facility policy.'
WHERE NOT EXISTS (SELECT 1 FROM `sources` WHERE `title` = 'Level 4 Pureed Food for Adults' AND `publisher` = 'International Dysphagia Diet Standardisation Initiative');
--> statement-breakpoint
INSERT INTO `sources` (`title`, `publisher`, `source_type`, `url`, `publication_date`, `accessed_at`, `verification_status`, `notes`)
SELECT
  'IDDSI Implementation Guide: Food Service and Catering',
  'International Dysphagia Diet Standardisation Initiative',
  'professional_organization_guidance',
  'https://www.iddsi.org/images/Publications-Resources/ImplementationGuides/English/food-service-and-catering_iddsi-implementation-guide_final_3april2018.pdf',
  '2018-03',
  '2026-07-27',
  'draft',
  'Implementation planning guidance, not a resident-specific clinical direction, recipe, regulatory requirement, or proof of product conformity.'
WHERE NOT EXISTS (SELECT 1 FROM `sources` WHERE `title` = 'IDDSI Implementation Guide: Food Service and Catering' AND `publisher` = 'International Dysphagia Diet Standardisation Initiative');
--> statement-breakpoint
INSERT INTO `sources` (`title`, `publisher`, `source_type`, `url`, `publication_date`, `accessed_at`, `verification_status`, `notes`)
SELECT
  'USIRG Frequently Asked Questions: Recipes',
  'United States IDDSI Reference Group',
  'professional_organization_guidance',
  'https://www.iddsi.org/images/AroundTheWorld/UnitedStates/faq/USIRGFAQRecipeRegulatoryNov2024.pdf',
  '2024-11',
  '2026-07-27',
  'draft',
  'United States implementation FAQ. It is not law, does not supply a universal recipe, and emphasizes that facilities must develop and test their own menu items.'
WHERE NOT EXISTS (SELECT 1 FROM `sources` WHERE `title` = 'USIRG Frequently Asked Questions: Recipes' AND `publisher` = 'United States IDDSI Reference Group');
--> statement-breakpoint
INSERT INTO `sources` (`title`, `publisher`, `source_type`, `url`, `publication_date`, `accessed_at`, `verification_status`, `notes`)
SELECT
  '42 CFR 483.60 — Food and Nutrition Services',
  'Electronic Code of Federal Regulations',
  'regulatory_guidance',
  'https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-G/part-483/subpart-B/section-483.60',
  NULL,
  '2026-07-27',
  'draft',
  'Federal long-term-care regulation for covered facilities. Applicability, state law, survey interpretation, and resident-specific implementation require qualified legal/regulatory and clinical review.'
WHERE NOT EXISTS (SELECT 1 FROM `sources` WHERE `title` = '42 CFR 483.60 — Food and Nutrition Services' AND `publisher` = 'Electronic Code of Federal Regulations');
--> statement-breakpoint
INSERT INTO `sources` (`title`, `publisher`, `source_type`, `url`, `publication_date`, `accessed_at`, `verification_status`, `notes`)
SELECT
  'FDA Food Code 2022',
  'U.S. Food and Drug Administration',
  'regulatory_guidance',
  'https://www.fda.gov/food/fda-food-code/food-code-2022',
  '2023-01-18',
  '2026-07-27',
  'draft',
  'FDA model code and best-practice advice, not automatically binding law. The applicable state/local adoption, amendments, facility policy, food/process, and current supplement must be confirmed.'
WHERE NOT EXISTS (SELECT 1 FROM `sources` WHERE `title` = 'FDA Food Code 2022' AND `publisher` = 'U.S. Food and Drug Administration');
--> statement-breakpoint
INSERT INTO `sources` (`title`, `publisher`, `source_type`, `url`, `publication_date`, `accessed_at`, `verification_status`, `notes`)
SELECT
  'Allergen Removal and Transfer Using Wiping and Cleaning Methods in Retail Food Establishments',
  'U.S. Food and Drug Administration',
  'regulatory_guidance',
  'https://www.fda.gov/food/retail-food-protection/allergen-removal-and-transfer-using-wiping-and-cleaning-methods-retail-food-establishments',
  NULL,
  '2026-07-27',
  'draft',
  'FDA study summary about selected allergens, surfaces, and cleaning methods. It does not validate every allergen, surface, chemical, equipment design, or facility procedure.'
WHERE NOT EXISTS (SELECT 1 FROM `sources` WHERE `title` = 'Allergen Removal and Transfer Using Wiping and Cleaning Methods in Retail Food Establishments' AND `publisher` = 'U.S. Food and Drug Administration');
--> statement-breakpoint

UPDATE `workflow_steps`
SET
  `instruction` = 'Confirm the resident’s current prescribed texture or therapeutic-diet requirement in the facility-designated authoritative record. Do not select, interpret, or change the required level. If the record is absent, conflicting, or unclear, stop and contact the facility-designated qualified clinician or interdisciplinary team.',
  `purpose` = 'Prevent production against an assumed, outdated, mismatched, or clinically unauthorized requirement.',
  `expected_result` = 'The team has one current resident-specific requirement, its authoritative record, and a named escalation path.',
  `measurable_check` = 'Record the resident/menu identifier, exact requirement as written, source record, date and time checked, and checker; resolve every discrepancy before production.',
  `common_mistake` = 'Using memory, a prior order, an unverified tray ticket, or culinary judgment to select or reinterpret the resident’s prescribed texture.',
  `corrective_action` = 'Stop the affected item, prevent release, and obtain clarification through the facility’s approved clinical and order-management process.',
  `risk_level` = 'high',
  `updated_at` = CURRENT_TIMESTAMP
WHERE `workflow_id` = (SELECT `id` FROM `workflows` WHERE `slug` = 'iddsi-level-4-pureed-meals-senior-living') AND `position` = 1;
--> statement-breakpoint
UPDATE `workflow_steps`
SET
  `instruction` = 'Match the resident requirement to the current approved menu item and controlled recipe. Confirm ingredients, documented allergens, substitutions, planned yield, portions, and batch size. Escalate any mismatch rather than improvising a substitute.',
  `purpose` = 'Align the production plan with the resident requirement and a repeatable recipe before texture processing begins.',
  `expected_result` = 'A current approved recipe, allergen check, substitution decision, and documented quantity target are available.',
  `measurable_check` = 'Reconcile menu, recipe version, allergen information, planned portions, and yield on the production record before ingredients are assembled.',
  `common_mistake` = 'Scaling by appearance, using an uncontrolled recipe, or substituting ingredients without resident-specific and facility review.',
  `corrective_action` = 'Pause the batch; obtain the approved recipe or substitution decision and recalculate the documented yield before proceeding.',
  `risk_level` = 'medium',
  `updated_at` = CURRENT_TIMESTAMP
WHERE `workflow_id` = (SELECT `id` FROM `workflows` WHERE `slug` = 'iddsi-level-4-pureed-meals-senior-living') AND `position` = 2;
--> statement-breakpoint
UPDATE `workflow_steps`
SET
  `instruction` = 'Select the facility-approved preparation method and the exact equipment authorized for the recipe, food, and batch size. Follow the current manufacturer instructions and local competency requirements; equipment choice alone does not establish IDDSI conformity.',
  `purpose` = 'Use a controlled, reproducible method while separating equipment suitability from the required finished-product tests.',
  `expected_result` = 'The production record identifies the approved method, equipment, attachment, and batch limit.',
  `measurable_check` = 'Verify the equipment identifier, assembly, condition, approved capacity, recipe method, and operator authorization before loading food.',
  `common_mistake` = 'Selecting equipment only because it is available, using the wrong attachment, or exceeding the facility-approved batch limit.',
  `corrective_action` = 'Stop, correct equipment or assembly, reduce the batch, or obtain an approved alternative method; remove damaged equipment from service.',
  `risk_level` = 'medium',
  `updated_at` = CURRENT_TIMESTAMP
WHERE `workflow_id` = (SELECT `id` FROM `workflows` WHERE `slug` = 'iddsi-level-4-pureed-meals-senior-living') AND `position` = 3;
--> statement-breakpoint
UPDATE `workflow_steps`
SET
  `instruction` = 'Prepare and cook the controlled recipe under the facility’s current food-safety, sanitation, allergen, and cross-contact procedures and the requirements adopted in its jurisdiction. Texture processing never substitutes for cooking, contamination prevention, or resident-specific allergen controls.',
  `purpose` = 'Produce a controlled food-safety and allergen-management base before texture modification.',
  `expected_result` = 'The batch meets every locally applicable preparation, cooking, sanitation, and allergen control required before processing.',
  `measurable_check` = 'Complete the facility-required ingredient, allergen, cooking, time/temperature, and corrective-action records using calibrated equipment and the adopted limits.',
  `common_mistake` = 'Assuming later blending corrects inadequate cooking, contamination, or allergen cross-contact.',
  `corrective_action` = 'Stop and isolate the batch; follow facility disposition rules for correction, discard, notification, and restart. Seek supervisory or qualified food-safety review when recovery is uncertain.',
  `risk_level` = 'high',
  `updated_at` = CURRENT_TIMESTAMP
WHERE `workflow_id` = (SELECT `id` FROM `workflows` WHERE `slug` = 'iddsi-level-4-pureed-meals-senior-living') AND `position` = 4;
--> statement-breakpoint
UPDATE `workflow_steps`
SET
  `instruction` = 'Process the approved recipe in controlled batches until it is visually uniform and ready for testing. Keep all components within the recipe and facility method. Do not label the product Level 4 based on appearance or processing time.',
  `purpose` = 'Create a consistent candidate product for the required finished-product assessment.',
  `expected_result` = 'The full batch is uniform, with no obvious unprocessed portions, and is ready for representative IDDSI testing.',
  `measurable_check` = 'Inspect multiple locations in the processed batch under the approved sampling procedure and record batch identity and processing completion.',
  `common_mistake` = 'Judging only the top of the vessel, overloading equipment, or treating smooth appearance as a test result.',
  `corrective_action` = 'Stop, divide and reprocess under the approved method, then recombine only if facility policy permits and test the service-ready batch.',
  `risk_level` = 'medium',
  `updated_at` = CURRENT_TIMESTAMP
WHERE `workflow_id` = (SELECT `id` FROM `workflows` WHERE `slug` = 'iddsi-level-4-pureed-meals-senior-living') AND `position` = 5;
--> statement-breakpoint
UPDATE `workflow_steps`
SET
  `instruction` = 'If the candidate product does not meet the approved recipe target, use only a facility-approved adjustment permitted for that resident and recipe. Measure and record every addition. Stop for qualified review when an adjustment could affect allergens, nutrition, hydration, medication interaction, or the resident’s care plan.',
  `purpose` = 'Make traceable recipe adjustments without crossing clinical, allergen, or nutrition boundaries.',
  `expected_result` = 'Every adjustment is authorized and measured, and the entire affected batch is ready for repeat testing.',
  `measurable_check` = 'Record ingredient, amount, time, batch identity, authorizing procedure, and resident-specific restriction check; reassess the service-ready batch.',
  `common_mistake` = 'Adding unmeasured liquid or thickener, substituting ingredients, or trying to rescue a batch without checking resident and recipe restrictions.',
  `corrective_action` = 'Stop and isolate the batch. Obtain approved culinary and, where applicable, dietitian/clinical direction; discard and remake when composition or conformity cannot be established.',
  `risk_level` = 'high',
  `updated_at` = CURRENT_TIMESTAMP
WHERE `workflow_id` = (SELECT `id` FROM `workflows` WHERE `slug` = 'iddsi-level-4-pureed-meals-senior-living') AND `position` = 6;
--> statement-breakpoint
UPDATE `workflow_steps`
SET
  `instruction` = 'At the intended service condition, test a representative sample using the current facility-approved IDDSI Level 4 procedure, including the applicable Fork Drip and Spoon Tilt tests. Follow the official method rather than remembered or improvised criteria.',
  `purpose` = 'Determine whether the actual service-ready product demonstrates the required Level 4 characteristics under the approved procedure.',
  `expected_result` = 'A traceable pass or fail is recorded for each required test on the identified batch at the relevant service condition.',
  `measurable_check` = 'Record batch and sample identity, service condition, test names, observations, result, time, and trained tester; retain or repeat evidence as facility policy requires.',
  `common_mistake` = 'Testing an unrepresentative sample, using remembered criteria, omitting a required test, or recording a pass from appearance alone.',
  `corrective_action` = 'Classify the batch as failed or unverified, isolate it from service, and use the approved correction and complete retest process. Escalate uncertain interpretation to an IDDSI-qualified reviewer.',
  `risk_level` = 'high',
  `updated_at` = CURRENT_TIMESTAMP
WHERE `workflow_id` = (SELECT `id` FROM `workflows` WHERE `slug` = 'iddsi-level-4-pureed-meals-senior-living') AND `position` = 7;
--> statement-breakpoint
UPDATE `workflow_steps`
SET
  `instruction` = 'When any required test fails or cannot be interpreted, isolate the full affected batch and record the observed failure. Apply only a correction allowed by the controlled recipe and facility policy, then repeat every required test on a representative service-ready sample.',
  `purpose` = 'Prevent failed, altered, or uncertain product from reaching resident service.',
  `expected_result` = 'The batch has a documented complete retest pass or a documented withheld, discarded, or escalated disposition.',
  `measurable_check` = 'Record initial failure, batch isolation, correction and amount, authorization, all retest observations, final result, and disposition.',
  `common_mistake` = 'Correcting by guesswork, testing only the adjusted portion, or releasing a batch after an incomplete or undocumented retest.',
  `corrective_action` = 'Continue to withhold the batch. Repeat the approved process or discard it; seek qualified culinary/IDDSI or clinical review when the failure cannot be resolved within the approved method.',
  `risk_level` = 'high',
  `updated_at` = CURRENT_TIMESTAMP
WHERE `workflow_id` = (SELECT `id` FROM `workflows` WHERE `slug` = 'iddsi-level-4-pureed-meals-senior-living') AND `position` = 8;
--> statement-breakpoint
UPDATE `workflow_steps`
SET
  `instruction` = 'Portion only a batch with a current documented test result. Maintain resident and batch identity, allergen controls, portion tools, holding conditions, and presentation controls through plating and delivery. Recheck when time, temperature, separation, or handling may have changed the product.',
  `purpose` = 'Carry the verified batch condition and resident-specific controls through service without substitution, cross-contact, or identity loss.',
  `expected_result` = 'Every portion remains linked to the correct resident requirement and controlled batch at release.',
  `measurable_check` = 'Reconcile batch, resident/menu identifier, allergen designation, portion count, service condition, and any required recheck against production and delivery records.',
  `common_mistake` = 'Mixing batches, losing resident identity, using shared utensils without approved controls, or assuming the product cannot change during holding.',
  `corrective_action` = 'Stop affected portions. Do not infer identity or conformity; reliably re-establish both under facility policy, retest when required, or remake and escalate.',
  `risk_level` = 'high',
  `updated_at` = CURRENT_TIMESTAMP
WHERE `workflow_id` = (SELECT `id` FROM `workflows` WHERE `slug` = 'iddsi-level-4-pureed-meals-senior-living') AND `position` = 9;
--> statement-breakpoint
UPDATE `workflow_steps`
SET
  `instruction` = 'Measure and document the product temperature at the facility-defined point using a calibrated device and the current limits adopted for the food, process, jurisdiction, and resident. Do not substitute an unsourced universal threshold or equipment display.',
  `purpose` = 'Verify the locally applicable food-safety and service-temperature control without confusing model guidance with adopted requirements.',
  `expected_result` = 'A traceable measurement meets the applicable approved requirement, or the item remains withheld.',
  `measurable_check` = 'Record food/batch, measurement location, temperature, time, calibrated device, applicable facility limit, operator, and corrective action.',
  `common_mistake` = 'Inferring product temperature from holding equipment, appearance, elapsed time, or a threshold not adopted by the facility’s jurisdiction.',
  `corrective_action` = 'Withhold the item, follow approved time/temperature correction or disposition, remeasure, and document. Escalate any resident-specific restriction or policy conflict.',
  `risk_level` = 'high',
  `updated_at` = CURRENT_TIMESTAMP
WHERE `workflow_id` = (SELECT `id` FROM `workflows` WHERE `slug` = 'iddsi-level-4-pureed-meals-senior-living') AND `position` = 10;
--> statement-breakpoint
UPDATE `workflow_steps`
SET
  `instruction` = 'Before closing the workflow, complete the facility-required production, order check, allergen, cooking, texture-test, adjustment, temperature, correction, release, and disposition records. Enter resident clinical information only in the record authorized by facility policy.',
  `purpose` = 'Create an operationally traceable record while respecting the boundary between production documentation and the resident health record.',
  `expected_result` = 'The required records show what was produced, tested, changed, released, withheld, discarded, or escalated, with no unresolved failure.',
  `measurable_check` = 'Use the current facility checklist to reconcile required fields, signatures, timestamps, exceptions, and linked batch/resident identifiers before sign-off.',
  `common_mistake` = 'Recording only successful results, omitting correction reasons, or placing clinical interpretation in an unauthorized production record.',
  `corrective_action` = 'Keep the workflow open, reconcile from available evidence, and escalate missing or conflicting information under facility documentation policy.',
  `risk_level` = 'medium',
  `updated_at` = CURRENT_TIMESTAMP
WHERE `workflow_id` = (SELECT `id` FROM `workflows` WHERE `slug` = 'iddsi-level-4-pureed-meals-senior-living') AND `position` = 11;
--> statement-breakpoint
UPDATE `workflow_steps`
SET
  `instruction` = 'Disassemble, pre-scrape, wash, rinse, sanitize, air dry, inspect, reassemble, and store equipment exactly as required by the current manufacturer instructions and facility sanitation/allergen procedures. Use only approved chemicals, concentrations, contact conditions, and verification methods.',
  `purpose` = 'Remove food soil, reduce contamination and allergen-transfer risk, and return serviceable equipment to controlled storage.',
  `expected_result` = 'All food-contact parts pass the facility post-cleaning inspection and sanitation check, are fully dry as required, and are stored or removed from service.',
  `measurable_check` = 'Complete the equipment-specific sanitation record, including equipment ID, procedure/version, chemical or method check, inspection, damage, and disposition.',
  `common_mistake` = 'Wiping visible surfaces only, skipping disassembly or air drying, using the wrong chemical conditions, or returning damaged components to service.',
  `corrective_action` = 'Keep equipment out of service; repeat the approved process, investigate allergen or contamination exposure, and obtain maintenance or supervisory clearance before reuse.',
  `risk_level` = 'high',
  `updated_at` = CURRENT_TIMESTAMP
WHERE `workflow_id` = (SELECT `id` FROM `workflows` WHERE `slug` = 'iddsi-level-4-pureed-meals-senior-living') AND `position` = 12;
--> statement-breakpoint

-- Claim links remain draft/insufficient until a qualified human verifies both the source and its application.
INSERT INTO `workflow_sources` (`workflow_id`, `workflow_step_id`, `source_id`, `claim_text`, `evidence_summary`, `confidence_level`, `limitations`)
SELECT w.id, s.id, src.id,
  'A covered long-term-care facility must provide food in a form designed to meet individual needs, and therapeutic diets are prescribed by the attending physician or delegated as state law allows.',
  '42 CFR 483.60 ties food form to individual need and separates therapeutic-diet prescription from culinary execution.',
  'insufficient',
  'Applicability to the facility and state delegation rules require qualified regulatory and clinical review; the regulation does not name IDDSI or specify the facility order workflow.'
FROM `workflows` w JOIN `workflow_steps` s ON s.workflow_id = w.id AND s.position = 1
JOIN `sources` src ON src.title = '42 CFR 483.60 — Food and Nutrition Services'
WHERE w.slug = 'iddsi-level-4-pureed-meals-senior-living'
AND NOT EXISTS (SELECT 1 FROM `workflow_sources` x WHERE x.workflow_id = w.id AND x.workflow_step_id = s.id AND x.source_id = src.id AND x.claim_text LIKE 'A covered long-term-care facility%');
--> statement-breakpoint
INSERT INTO `workflow_sources` (`workflow_id`, `workflow_step_id`, `source_id`, `claim_text`, `evidence_summary`, `confidence_level`, `limitations`)
SELECT w.id, s.id, src.id,
  'Facilities should develop and test their own menu items because recipe results vary with product, ingredients, temperature, equipment, culinary skill, and holding.',
  'The USIRG FAQ identifies recipe and process variables and says IDDSI does not supply universal recipes.',
  'insufficient',
  'The FAQ is implementation guidance, not law; facility recipe, allergen, substitution, yield, and clinical controls are still required.'
FROM `workflows` w JOIN `workflow_steps` s ON s.workflow_id = w.id AND s.position IN (2,3,5,6,9)
JOIN `sources` src ON src.title = 'USIRG Frequently Asked Questions: Recipes'
WHERE w.slug = 'iddsi-level-4-pureed-meals-senior-living'
AND NOT EXISTS (SELECT 1 FROM `workflow_sources` x WHERE x.workflow_id = w.id AND x.workflow_step_id = s.id AND x.source_id = src.id AND x.claim_text LIKE 'Facilities should develop%');
--> statement-breakpoint
INSERT INTO `workflow_sources` (`workflow_id`, `workflow_step_id`, `source_id`, `claim_text`, `evidence_summary`, `confidence_level`, `limitations`)
SELECT w.id, s.id, src.id,
  'Food in covered long-term-care facilities must accommodate resident allergies and be stored, prepared, distributed, and served under professional food-service safety standards.',
  '42 CFR 483.60(d) and (i) establish resident allergy accommodation and professional food-service safety requirements.',
  'insufficient',
  'The regulation does not provide the facility allergen matrix, adopted jurisdictional limits, recipe, correction process, or resident-specific clinical direction.'
FROM `workflows` w JOIN `workflow_steps` s ON s.workflow_id = w.id AND s.position IN (4,6,9,10,12)
JOIN `sources` src ON src.title = '42 CFR 483.60 — Food and Nutrition Services'
WHERE w.slug = 'iddsi-level-4-pureed-meals-senior-living'
AND NOT EXISTS (SELECT 1 FROM `workflow_sources` x WHERE x.workflow_id = w.id AND x.workflow_step_id = s.id AND x.source_id = src.id AND x.claim_text LIKE 'Food in covered long-term-care%');
--> statement-breakpoint
INSERT INTO `workflow_sources` (`workflow_id`, `workflow_step_id`, `source_id`, `claim_text`, `evidence_summary`, `confidence_level`, `limitations`)
SELECT w.id, s.id, src.id,
  'The FDA Food Code supplies model controls for cooking, contamination prevention, time/temperature control, cleaning, and sanitizing in retail and food service.',
  'The current FDA Food Code is a primary model-code source for food-safety process controls.',
  'insufficient',
  'It is model guidance until adopted. The applicable state/local code, amendments, facility policy, food/process classification, and corrective actions are not yet entered.'
FROM `workflows` w JOIN `workflow_steps` s ON s.workflow_id = w.id AND s.position IN (4,9,10,12)
JOIN `sources` src ON src.title = 'FDA Food Code 2022'
WHERE w.slug = 'iddsi-level-4-pureed-meals-senior-living'
AND NOT EXISTS (SELECT 1 FROM `workflow_sources` x WHERE x.workflow_id = w.id AND x.workflow_step_id = s.id AND x.source_id = src.id AND x.claim_text LIKE 'The FDA Food Code supplies%');
--> statement-breakpoint
INSERT INTO `workflow_sources` (`workflow_id`, `workflow_step_id`, `source_id`, `claim_text`, `evidence_summary`, `confidence_level`, `limitations`)
SELECT w.id, s.id, src.id,
  'IDDSI Level 4 puréed food has defined characteristics and uses the applicable Fork Drip and Spoon Tilt tests rather than appearance alone.',
  'The official framework, testing methods, and adult handout describe Level 4 characteristics and the named tests.',
  'insufficient',
  'A qualified reviewer must verify the exact method and application; each actual recipe and service-ready batch still requires representative testing.'
FROM `workflows` w JOIN `workflow_steps` s ON s.workflow_id = w.id AND s.position IN (5,7,8,9)
JOIN `sources` src ON src.title = CASE
  WHEN s.position = 5 THEN 'Complete IDDSI Framework: Detailed Definitions 2.0'
  WHEN s.position = 7 THEN 'Testing Methods for Use with the IDDSI Framework 2.0'
  WHEN s.position = 8 THEN 'Testing Methods for Use with the IDDSI Framework 2.0'
  ELSE 'Level 4 Pureed Food for Adults' END
WHERE w.slug = 'iddsi-level-4-pureed-meals-senior-living'
AND NOT EXISTS (SELECT 1 FROM `workflow_sources` x WHERE x.workflow_id = w.id AND x.workflow_step_id = s.id AND x.source_id = src.id AND x.claim_text LIKE 'IDDSI Level 4 puréed%');
--> statement-breakpoint
INSERT INTO `workflow_sources` (`workflow_id`, `workflow_step_id`, `source_id`, `claim_text`, `evidence_summary`, `confidence_level`, `limitations`)
SELECT w.id, s.id, src.id,
  'Full wash-rinse-sanitize-air-dry cleaning was effective at removing and minimizing transfer of the allergens and surfaces studied by FDA.',
  'FDA reports experimental findings relevant to food-contact surface cleaning and allergen transfer.',
  'insufficient',
  'The study does not cover every allergen, material, equipment geometry, soil, chemical, or facility method; manufacturer and facility procedures remain required.'
FROM `workflows` w JOIN `workflow_steps` s ON s.workflow_id = w.id AND s.position = 12
JOIN `sources` src ON src.title = 'Allergen Removal and Transfer Using Wiping and Cleaning Methods in Retail Food Establishments'
WHERE w.slug = 'iddsi-level-4-pureed-meals-senior-living'
AND NOT EXISTS (SELECT 1 FROM `workflow_sources` x WHERE x.workflow_id = w.id AND x.workflow_step_id = s.id AND x.source_id = src.id AND x.claim_text LIKE 'Full wash-rinse-sanitize-air-dry%');
--> statement-breakpoint
INSERT INTO `workflow_sources` (`workflow_id`, `workflow_step_id`, `source_id`, `claim_text`, `evidence_summary`, `confidence_level`, `limitations`)
SELECT w.id, NULL, src.id,
  'Food-service implementation requires coordinated planning, training, testing, audit, and local procedures; an official framework does not by itself implement a facility workflow.',
  'The IDDSI food-service implementation guide supports a governed multidisciplinary implementation process.',
  'insufficient',
  'Planning guidance does not verify this workflow, supply facility policy, establish reviewer qualifications, or authorize clinical decisions.'
FROM `workflows` w JOIN `sources` src ON src.title = 'IDDSI Implementation Guide: Food Service and Catering'
WHERE w.slug = 'iddsi-level-4-pureed-meals-senior-living'
AND NOT EXISTS (SELECT 1 FROM `workflow_sources` x WHERE x.workflow_id = w.id AND x.workflow_step_id IS NULL AND x.source_id = src.id);
--> statement-breakpoint

UPDATE `workflows`
SET
  `summary` = 'EDITORIALLY VALIDATED DRAFT: A twelve-step operational workflow mapped to current primary sources and explicit facility/clinical boundaries. Authoritative materials have been collected but not yet verified by qualified human reviewers.',
  `next_action` = 'Obtain the applicable state/local code, versioned facility policies, exact equipment manuals, and qualified operational, food-safety, IDDSI, dietetic, and clinical review. Verify each source link and resolve every blocked quality gate before publication.',
  `confidence_level` = 'insufficient',
  `reviewer_user_id` = NULL,
  `last_verified_at` = NULL,
  `review_due_at` = NULL,
  `status` = 'draft',
  `published_at` = NULL,
  `revision_number` = `revision_number` + 1,
  `updated_at` = CURRENT_TIMESTAMP
WHERE `slug` = 'iddsi-level-4-pureed-meals-senior-living';
--> statement-breakpoint
INSERT INTO `editorial_events` (`entity_type`, `entity_id`, `action`, `actor_email`, `detail`)
SELECT
  'workflow',
  w.id,
  'evidence_mapping_completed',
  'system:evidence-editorial-sprint',
  '{"status":"draft","confidenceLevel":"insufficient","sourcesEntered":8,"sourceLinks":21,"stepsRevised":12,"verificationBoundary":"Bibliographic collection completed; no qualified human source or claim verification asserted.","publication":"blocked"}'
FROM `workflows` w
WHERE w.slug = 'iddsi-level-4-pureed-meals-senior-living'
AND NOT EXISTS (
  SELECT 1 FROM `editorial_events` e
  WHERE e.entity_type = 'workflow' AND e.entity_id = w.id AND e.action = 'evidence_mapping_completed'
);
