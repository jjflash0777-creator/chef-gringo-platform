# IDDSI Pilot Evidence Map

## Verification status

Eight primary sources and twenty-one claim links are recorded by migration `0003_validate_iddsi_pilot_evidence.sql`. Bibliographic identity, URL, publication date where available, access date, and limitations were checked on 2026-07-27.

All source records and claim links remain `draft` / `insufficient`. “Collected” does not mean “verified.” No qualified human has attested that a source is current, applicable to a particular facility, or correctly applied to the claim.

## Sources entered

| Key | Source | Publisher | Date | Type | Current limitation |
|---|---|---|---|---|---|
| IDDSI-F | Complete IDDSI Framework: Detailed Definitions 2.0 | IDDSI | 2019-07-31 | Professional standard | Does not prescribe a resident diet or prove a recipe/batch passes |
| IDDSI-T | Testing Methods for Use with the IDDSI Framework 2.0 | IDDSI | 2019-07-31 | Professional standard | Exact procedure and application require competent review |
| IDDSI-A | Level 4 Pureed Food for Adults | IDDSI | 2019-01-30 | Professional-organization guidance | General handout; not a complete procedure or clinical direction |
| IDDSI-I | IDDSI Implementation Guide: Food Service and Catering | IDDSI | 2018-03 | Professional-organization guidance | Planning guidance; does not validate this workflow |
| USIRG-R | USIRG Frequently Asked Questions: Recipes | United States IDDSI Reference Group | 2024-11 | Professional-organization guidance | Not law and supplies no universal recipe |
| CFR-483 | 42 CFR 483.60 — Food and Nutrition Services | eCFR | Current; accessed 2026-07-27 | Regulatory guidance | Applicability, state delegation, and implementation require review |
| FDA-FC | FDA Food Code 2022 | FDA | 2023-01-18 version | Regulatory guidance | Model code; state/local adoption and amendments are unknown |
| FDA-A | Allergen Removal and Transfer Using Wiping and Cleaning Methods in Retail Food Establishments | FDA | Date not stated on page | Regulatory guidance | Limited to studied allergens, surfaces, and methods |

Primary URLs and complete limitations are stored in the `sources` records. No source is affiliate-funded.

## Claim-level map

| Workflow Step | Claim | Source | Evidence Type | Confidence | Limitations | Review Required |
|---|---|---|---|---|---|---|
| Workflow | Food-service implementation requires coordinated planning, training, testing, audit, and local procedures | IDDSI-I | Implementation guidance | Insufficient | Does not validate this workflow or assign facility roles | Operational, IDDSI, facility |
| 1 | Covered facilities provide food in a form meeting individual need; therapeutic diets follow authorized prescription/delegation | CFR-483 | Federal regulation | Insufficient | Applicability and state delegation not reviewed; no IDDSI-specific order process | Regulatory, dietitian, clinical |
| 2 | Facilities must control and test their own recipes because results vary with recipe/process variables | USIRG-R | Professional guidance | Insufficient | Facility recipe, allergen, substitution, and yield controls absent | Culinary operations, dietitian, facility |
| 3 | Ingredient, equipment, temperature, skill, and holding variables affect recipe results | USIRG-R | Professional guidance | Insufficient | Exact equipment/manual and approved batch limits absent | Culinary operations, equipment, facility |
| 4 | Food preparation must meet resident allergy needs and professional food-service safety standards | CFR-483 | Federal regulation | Insufficient | Resident instructions and facility procedures absent | Food safety, regulatory, facility |
| 4 | Cooking and contamination controls are separate from texture modification | FDA-FC | Model food code | Insufficient | Jurisdictional adoption, food classification, and local limits absent | Food safety, state/local |
| 5 | Level 4 has defined characteristics and cannot be established from smooth appearance alone | IDDSI-F | Professional standard | Insufficient | Recipe and batch must be tested; reviewer competency absent | IDDSI, culinary |
| 5 | Recipe outcomes vary with production variables | USIRG-R | Professional guidance | Insufficient | No controlled facility recipe or equipment validation | Culinary operations |
| 6 | Changes can affect resident allergies and individual dietary needs | CFR-483 | Federal regulation | Insufficient | Does not define approved adjustments or clinical escalation | Dietitian, clinical, facility |
| 6 | Recipe and process variables require measured adjustment followed by reassessment | USIRG-R | Professional guidance | Insufficient | No approved adjustment matrix or recipe-specific evidence | Culinary, IDDSI, dietitian |
| 7 | Level 4 puréed food uses applicable Fork Drip and Spoon Tilt testing | IDDSI-T | Professional standard | Insufficient | Exact current procedure, service condition, sampling, and tester competency need review | IDDSI subject-matter reviewer |
| 8 | A corrected service-ready product must be assessed with the applicable tests rather than inferred to conform | IDDSI-T | Professional standard | Insufficient | Correction/retest procedure and acceptance authority are facility-specific | IDDSI, culinary, facility |
| 9 | Food must preserve resident allergy and individual-need controls through service | CFR-483 | Federal regulation | Insufficient | Resident identification and cross-contact procedures absent | Food safety, clinical, facility |
| 9 | Holding and production variables can affect the finished recipe result | USIRG-R | Professional guidance | Insufficient | No facility recheck trigger or validation study | Culinary, IDDSI |
| 9 | Service-ready Level 4 characteristics must be maintained and checked | IDDSI-A | General professional guidance | Insufficient | Handout is not a complete operational test procedure | IDDSI |
| 9 | Service/distribution requires contamination and time/temperature controls | FDA-FC | Model food code | Insufficient | Adoption and local service controls unknown | Food safety, state/local |
| 10 | Covered facilities provide food at a safe and appetizing temperature | CFR-483 | Federal regulation | Insufficient | No specific limit or method; resident-specific limits unknown | Regulatory, clinical, facility |
| 10 | Time/temperature controls depend on the food and adopted code | FDA-FC | Model food code | Insufficient | State/local adoption, food classification, device, and corrective action missing | Food safety, state/local |
| 12 | Covered facilities must follow professional food-service safety standards | CFR-483 | Federal regulation | Insufficient | Does not provide equipment-specific method | Regulatory, facility |
| 12 | Equipment cleaning and sanitizing require controlled procedures | FDA-FC | Model food code | Insufficient | Manufacturer instructions, chemicals, adoption, and facility verification missing | Food safety, equipment, state/local |
| 12 | Full wash-rinse-sanitize-air-dry cleaning reduced allergen transfer in the FDA study | FDA-A | Government research summary | Insufficient | Not all allergens, surfaces, equipment, soils, or chemicals were studied | Food safety, allergen, facility |

## Claims intentionally left to facility or qualified review

The evidence model does not contain placeholders masquerading as sources. The following remain unmapped until real documents or reviewers are provided:

- state/local adopted food code and amendments;
- resident order and tray-ticket reconciliation policy;
- approved recipes, yields, allergens, substitutions, adjustment limits, and retest procedure;
- exact equipment manufacturer manuals and batch limits;
- calibration, cooking, holding, service-temperature, cleaning, and sanitizing procedures;
- resident identification, clinical escalation, documentation, and record-retention policies;
- qualified operational, food-safety, IDDSI, dietetic, speech-language pathology, facility-policy, and final publication decisions.

## Coverage result

Every high-risk step has at least one step-level source link, but zero high-risk steps have **verified** step-level evidence. The data model supports the mapping; the publication gate correctly remains blocked.
