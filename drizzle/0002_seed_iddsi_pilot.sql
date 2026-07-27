INSERT INTO `customer_personas` (`name`, `slug`, `needs`, `constraints`)
VALUES (
  'Culinary Director or Certified Dietary Manager',
  'culinary-director-certified-dietary-manager',
  'Repeatable production controls, staff-ready instructions, traceability, and interdisciplinary review.',
  'Must follow each resident’s prescribed plan, current facility policy, and qualified clinical guidance.'
)
ON CONFLICT(`slug`) DO NOTHING;
--> statement-breakpoint
INSERT INTO `culinary_environments` (`name`, `slug`, `requirements`)
VALUES (
  'Senior-Living Kitchen',
  'senior-living-kitchen',
  'Batch production, sanitation, allergen controls, safe holding and service, resident-specific instructions, and documented escalation.'
)
ON CONFLICT(`slug`) DO NOTHING;
--> statement-breakpoint
INSERT INTO `use_cases` (`name`, `slug`, `problem_statement`, `outcome`)
VALUES (
  'Produce consistent IDDSI Level 4 puréed meals',
  'produce-consistent-iddsi-level-4-pureed-meals',
  'The operation needs a repeatable, reviewable method for preparing prescribed puréed meals without treating unsourced draft guidance as verified.',
  'Support safe, repeatable, and verifiable preparation while deferring to current authoritative sources, the prescribed plan, facility policy, and qualified review.'
)
ON CONFLICT(`slug`) DO NOTHING;
--> statement-breakpoint
INSERT INTO `workflows` (
  `slug`, `title`, `summary`, `problem_statement`, `job_statement`,
  `intended_outcome`, `next_action`, `affiliate_disclosure`, `status`,
  `confidence_level`, `primary_persona_id`, `primary_environment_id`,
  `primary_use_case_id`, `created_by_user_id`
)
SELECT
  'iddsi-level-4-pureed-meals-senior-living',
  'Producing Consistent IDDSI Level 4 Puréed Meals in a Senior-Living Kitchen',
  'DRAFT PILOT: A governed operational sequence awaiting authoritative sources and qualified verification before publication.',
  'Inconsistent texture-modified meal production can create quality and safety risk when the prescribed requirement, process controls, assessment, and corrective action are not consistently followed.',
  'Prepare and document a repeatable puréed-meal production result for a resident-specific prescribed texture requirement within the facility’s approved process.',
  'Support safe, repeatable, and verifiable preparation of prescribed IDDSI Level 4 puréed meals.',
  'Add valid authoritative sources, verify each high-risk claim, assign an independent qualified reviewer, and complete every quality gate before publication.',
  'No affiliate-linked products are referenced.',
  'draft',
  'insufficient',
  (SELECT `id` FROM `customer_personas` WHERE `slug` = 'culinary-director-certified-dietary-manager'),
  (SELECT `id` FROM `culinary_environments` WHERE `slug` = 'senior-living-kitchen'),
  (SELECT `id` FROM `use_cases` WHERE `slug` = 'produce-consistent-iddsi-level-4-pureed-meals'),
  'system:pilot-seed'
WHERE NOT EXISTS (
  SELECT 1 FROM `workflows` WHERE `slug` = 'iddsi-level-4-pureed-meals-senior-living'
);
--> statement-breakpoint
INSERT INTO `workflow_steps` (
  `workflow_id`, `position`, `title`, `instruction`, `purpose`, `expected_result`,
  `measurable_check`, `common_mistake`, `corrective_action`, `risk_level`
)
SELECT w.id, v.position, v.title, v.instruction, v.purpose, v.expected_result,
  v.measurable_check, v.common_mistake, v.corrective_action, v.risk_level
FROM `workflows` w
JOIN (
  SELECT 1 position, 'Confirm the prescribed texture requirement' title,
    'DRAFT: Confirm the individual’s current prescribed texture requirement and the facility-approved instructions before production.' instruction,
    'Prevent production against an assumed, outdated, or mismatched requirement.' purpose,
    'The production team has one current, resident-specific requirement and an escalation contact.' expected_result,
    'Record the instruction source, date checked, resident/menu identifier, and person confirming it.' measurable_check,
    'Relying on a tray ticket, memory, or prior instruction without checking the current approved record.' common_mistake,
    'Stop production for that individual item and escalate through the facility’s approved process before proceeding.' corrective_action,
    'high' risk_level
  UNION ALL SELECT 2, 'Review the menu item and production quantity',
    'DRAFT: Confirm the menu item, recipe, allergens, required yield, portion count, and batch size using approved operational records.',
    'Align the production plan with the intended meal service and resident-specific requirements.',
    'The team has an identified recipe or controlled method and a documented quantity target.',
    'Compare planned portions and yield with the production sheet before preparation.',
    'Scaling by visual estimate or combining incompatible menu components.',
    'Recalculate the batch using the approved recipe or obtain supervisory review before production.',
    'medium'
  UNION ALL SELECT 3, 'Select an appropriate preparation method',
    'DRAFT: Choose a facility-approved method and equipment appropriate to the food, batch size, and required result.',
    'Match process and equipment to the operational job without implying that equipment alone ensures conformity.',
    'A documented method and equipment choice appropriate to the batch is selected.',
    'Record the selected method and identify any required pre-processing or batch limits.',
    'Choosing equipment by availability alone or exceeding a practical batch capacity.',
    'Reduce batch size or select an approved alternative method and document the change.',
    'medium'
  UNION ALL SELECT 4, 'Prepare and cook the food safely',
    'DRAFT: Prepare and cook ingredients using the facility’s approved recipe, sanitation, allergen, and food-safety procedures.',
    'Establish a safe and workable base before texture processing.',
    'Ingredients are prepared and cooked according to current approved operational controls.',
    'Complete the facility-required preparation and cooking records.',
    'Treating later purée processing as a substitute for correct cooking or allergen controls.',
    'Stop, correct the process where permitted, or discard and restart under facility policy.',
    'high'
  UNION ALL SELECT 5, 'Process the food into a smooth purée',
    'DRAFT: Process the prepared food in controlled batches until the planned smooth and uniform result is reached, without making an unsourced conformity claim.',
    'Create a consistent base for the required assessment.',
    'The batch appears uniform and is ready for the applicable verified assessment.',
    'Inspect the full batch for visible or tactile inconsistency using the approved procedure.',
    'Processing only the top of the batch or overloading equipment.',
    'Reprocess in smaller controlled batches and recombine only when allowed by the approved method.',
    'medium'
  UNION ALL SELECT 6, 'Adjust consistency without reducing safety or quality',
    'DRAFT: Use only facility-approved ingredients and methods to adjust the batch, recording additions and avoiding unsupported substitutions.',
    'Correct consistency while preserving recipe, allergen, nutrition, and quality controls.',
    'Adjustments are traceable and the batch is ready for reassessment.',
    'Record each addition and reassess the entire affected batch.',
    'Adding unmeasured liquid or thickener, or changing ingredients without checking restrictions.',
    'Stop, quantify what was added, obtain approved guidance, and remake when the batch cannot be safely recovered.',
    'high'
  UNION ALL SELECT 7, 'Conduct the applicable texture assessment',
    'DRAFT: Perform only the current, facility-approved assessment supported by a verified source and qualified review; record the result without improvising criteria.',
    'Verify the production result against the applicable approved requirement.',
    'A documented pass/fail result is available for the batch at the relevant service condition.',
    'Record test method, condition, result, time, and tester according to the approved procedure.',
    'Using remembered criteria, testing an unrepresentative sample, or recording a pass without evidence.',
    'Treat the result as failed or unverified, isolate the batch, and escalate for correction and retest.',
    'high'
  UNION ALL SELECT 8, 'Correct a failed result',
    'DRAFT: Isolate the affected batch, identify the observed failure, apply only an approved corrective action, and repeat the full required assessment.',
    'Prevent a failed or uncertain result from moving to service.',
    'The batch is either corrected and documented as passing under the approved procedure or withheld and escalated.',
    'Document the failure, corrective action, retest result, and disposition.',
    'Correcting by guesswork, testing only the adjusted portion, or serving after an undocumented retest.',
    'Withhold service, repeat the approved correction and assessment, or discard/escalate according to facility policy.',
    'high'
  UNION ALL SELECT 9, 'Portion and plate consistently',
    'DRAFT: Portion the verified batch with approved tools and presentation controls while preventing cross-contact, separation, or identification errors.',
    'Carry the controlled batch result into resident-specific service.',
    'Portions are consistent, identifiable, and protected through plating.',
    'Compare portion count and identification against the production and service records.',
    'Mixing batches, losing resident identification, or allowing portions to change before service.',
    'Stop the affected portions, restore identification when reliably possible, and recheck or remake as required.',
    'high'
  UNION ALL SELECT 10, 'Verify safe service temperature',
    'DRAFT: Measure and document service temperature using current facility policy and applicable verified guidance; do not use an unsourced threshold.',
    'Confirm service conditions are controlled and documented.',
    'A current documented result meets the facility-approved requirement or the item is withheld.',
    'Record the measurement, time, equipment, and corrective action when required.',
    'Assuming temperature from holding equipment or appearance.',
    'Withhold, correct under approved policy, remeasure, and document before release.',
    'high'
  UNION ALL SELECT 11, 'Document completion or corrective action',
    'DRAFT: Complete the required production, assessment, correction, verification, and disposition records before closing the workflow.',
    'Make the result traceable for operations, review, and resident safety.',
    'Required records identify what was produced, checked, corrected, and released or withheld.',
    'Review the record for missing fields and unresolved failures before sign-off.',
    'Documenting only successful results or omitting the reason for a correction.',
    'Reconcile records while evidence is available and escalate any unresolved uncertainty.',
    'medium'
  UNION ALL SELECT 12, 'Clean and sanitize equipment',
    'DRAFT: Clean, sanitize, inspect, and store equipment using current manufacturer instructions and facility procedures.',
    'Prevent contamination and prepare equipment for safe reuse.',
    'Equipment passes the facility’s documented post-use check.',
    'Complete the required sanitation check and record any damage or maintenance need.',
    'Cleaning visible surfaces only or reassembling equipment while components remain soiled or damaged.',
    'Remove equipment from service when necessary and repeat the approved cleaning, sanitation, inspection, or maintenance process.',
    'high'
) v
WHERE w.slug = 'iddsi-level-4-pureed-meals-senior-living'
  AND NOT EXISTS (
    SELECT 1 FROM `workflow_steps` s WHERE s.workflow_id = w.id
  );
--> statement-breakpoint
INSERT INTO `editorial_events` (`entity_type`, `entity_id`, `action`, `actor_email`, `detail`)
SELECT
  'workflow',
  w.id,
  'workflow_created',
  'system:pilot-seed',
  '{"status":"draft","confidenceLevel":"insufficient","sourceSafety":"No sources were invented or seeded; publication is blocked pending verified evidence."}'
FROM `workflows` w
WHERE w.slug = 'iddsi-level-4-pureed-meals-senior-living'
  AND NOT EXISTS (
    SELECT 1 FROM `editorial_events` e
    WHERE e.entity_type = 'workflow' AND e.entity_id = w.id AND e.action = 'workflow_created'
  );
