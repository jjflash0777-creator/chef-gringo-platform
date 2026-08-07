# Knowledge Core Reviewer Qualification

## Governing principle

Authentication proves an account identity. Editor authorization permits controlled changes. Neither demonstrates subject-matter competence or independence.

A reviewer assignment is valid only when identity, role, current qualifications, scope, conflicts, evidence reviewed, decision, and date are documented outside or alongside the application.

## Roles

| Role | Responsibility | Minimum qualification for this pilot | Must not do |
|---|---|---|---|
| Editor | Structure claims, enter sources, apply approved wording, maintain links and limitations | Training in the Knowledge Constitution, source hierarchy, attribution, and application workflow | Mark personal research as qualified verification; approve own high-risk work |
| Operational reviewer | Assess recipe control, batching, equipment workflow, feasibility, records, and corrective action | Demonstrated senior-living culinary/foodservice operations competence; preferably a qualified food-and-nutrition-services leader familiar with the facility | Interpret or change resident clinical orders |
| Subject-matter reviewer | Verify claims within a named specialty | Current competence and credentials appropriate to food safety, IDDSI implementation, allergen control, or equipment procedures | Approve claims outside documented scope |
| Clinical reviewer | Review diet-order, swallowing, nutrition, and escalation boundaries | For nutrition/diet orders: registered/licensed dietitian or other legally qualified professional; for swallowing boundaries: appropriately licensed speech-language pathologist or other clinician acting within law and facility privileges | Convert operational guidance into resident-specific clinical advice without assessment/order authority |
| Final publisher | Confirm all gates, independence, role coverage, source status, limitations, and documented decisions | Authorized publisher with governance training; must rely on completed qualified reviews rather than infer competence from account access | Weaken gates, self-approve high-risk authorship, or treat source collection as verification |

## Claim-to-reviewer matrix

| Claim type | Required reviewer |
|---|---|
| Culinary production, controlled recipe, batching, yield, presentation | Operational reviewer with senior-living culinary competence |
| Cooking, holding, temperature, sanitation, allergen cross-contact | Qualified food-safety reviewer familiar with adopted jurisdictional requirements |
| IDDSI definitions and testing implementation | Reviewer demonstrably competent in current IDDSI framework/testing and food-service application |
| Diet-order interpretation or therapeutic-diet authorization | Registered/licensed dietitian, attending physician, or other professional authorized under applicable law and facility policy |
| Dysphagia/swallowing assessment or resident-specific texture selection | Appropriately licensed speech-language pathologist and/or clinical team member acting within scope and care-plan authority |
| Facility policies, records, escalation, survey expectations | Named facility policy owner/compliance leader with authority over the specific policy |
| Equipment assembly, limits, cleaning, maintenance | Equipment owner/qualified operator using the exact current manufacturer documentation; maintenance review where required |

## Independence and evidence

- The workflow creator may not be its sole high-risk reviewer.
- Reviewers disclose employment, affiliate, vendor, and authorship conflicts.
- Each reviewer approves only the mapped claims within their scope.
- “Reviewed” records the exact version, source links, limitations, exceptions, and decision.
- A final publisher confirms coverage but does not substitute for missing specialist review.
- Direct professional experience must remain labeled and cannot supersede official or regulatory sources.

## Application limitation

The current application stores one `reviewer_user_id` and one workflow-level verification/review schedule. It cannot separately represent operational, food-safety, IDDSI, clinical, facility-policy, equipment, and final-publisher roles or claim-specific reviewer credentials.

During this sprint:

- no reviewer is assigned;
- no source or claim is marked verified;
- role/credential evidence must be maintained in a governed external review record until the schema is intentionally expanded;
- the single assigned reviewer field must identify the final accountable reviewer only after all specialist reviews are complete.

This limitation is material but does not prevent evidence preparation. It does prevent an honest claim that all required specialist reviews are represented in the application.
