# Chef Gringo Intelligence Audit — 2026-09-20

## Decision

The benchmark approach is viable and should be built before further broad feature work.

Chef Gringo already has a public assistant path (`/api/chef-gringo` → `runAssistant`), a typed request/response contract, intent classification, clarification rules, safety controls, governed evidence attachment, commercial separation, and extensive Node tests. That gives the benchmark a stable target.

The current system is not yet the full "AI kitchen/operator assistant" product. The benchmark should expose the gaps rather than paper over them.

## What already works

- One public assistant contract for question, conversation, location, budget, operating context, dietary context, and photo metadata.
- 13 hospitality intents covering recipes, technique, substitutions, food safety, dietary accommodation, equipment, software, food cost/labor, sourcing, startup, marketplace comparison, and general questions.
- Conservative safety behavior for food safety, dietary/medical boundaries, electrical/gas/refrigeration hazards.
- Clarification logic that asks only when missing information materially changes the answer.
- Optional model provider through an OpenAI-compatible `/chat/completions` endpoint.
- Curated-corpus and repository evidence hooks.
- Commercial recommendations are attached after the answer path and are tested separately from editorial reasoning.
- Existing automated tests already exercise many contract and safety behaviors.

## Gaps the benchmark must expose

### 1. Live research is disabled
`LIVE_RESEARCH_ENABLED = false`. Chef Gringo can use accepted repository/corpus evidence, but it cannot currently do a fresh web lookup for changing facts such as current prices, store inventory, recalls, regulations, or local suppliers.

### 2. Photos are not actually inspected
The UI accepts a photo, but only filename/MIME/size metadata reaches the assistant. The response explicitly says Chef Gringo cannot inspect images yet. Real kitchen use frequently depends on photos of meat, equipment, labels, error displays, produce, or plating.

### 3. Intent coverage is narrower than real work
The public intents do not explicitly model several recurring operator jobs:
- recipe/production scaling
- event production
- staffing/scheduling feasibility
- purchasing/order quantities
- inventory/yield
- translation/staff communication
- emergency continuity operations
- management/financial-message interpretation

Some can fall into existing intents, but benchmark results should tell us whether explicit routing is needed.

### 4. Answer generation has two AI prompt paths
`assistant-service.ts` and `chefGringoRuntime.ts` each define a Chef Gringo system prompt. The public homepage currently uses `runAssistant`; benchmark scoring must target that exact path. Long term these prompts should converge to avoid behavioral drift.

### 5. Knowledge coverage is still uneven
The architecture supports curated retrieval, but the legacy knowledge engine began with a narrow culinary seed. Strong food-safety, regulatory, senior-living, equipment, costing, purchasing, and staffing answers depend on the accepted corpus actually containing those domains.

### 6. Automatic collection of user questions is intentionally absent
Current analytics deliberately strip prompts/questions. That is good privacy behavior. We should not silently log real user questions for training. An opt-in "help improve Chef Gringo" capture path would be a separate future product decision.

### 7. Model quality depends on runtime configuration
Production can use a configured OpenAI-compatible model. Local development defaults to `gemma3:1b` through Ollama, which is useful for plumbing but is not an adequate benchmark target for high-quality hospitality reasoning. Benchmark reports must record which model/runtime produced each answer.

### 8. GitHub is not yet the complete production source of truth
Production version 23 contains Sites-only history not represented by GitHub `main`. This branch is additive benchmark work only. Do not deploy it directly over production. Before any future deployment, reconcile the branch with the current Sites production version exactly as was done for versions 22 and 23.

## Benchmark design

Use two layers.

### Layer A — deterministic contract gates
Fast automated checks for:
- intent
- clarification vs direct answer
- safety escalation
- prohibited advice
- evidence/research capability truthfulness
- commercial separation
- required context handling

These run without spending model tokens.

### Layer B — live answer-quality runs
Send realistic operator questions through the same `runAssistant` path used by the homepage and save structured results. Grade:
- answers the actual question
- practical/actionable
- technically correct
- asks only necessary follow-up
- states assumptions/unknowns
- appropriate safety boundary
- appropriate evidence/source use
- no invented live facts
- commercial content does not lead the answer

A separate judge model is preferable to self-grading. Until one is configured, Layer B should produce a report rather than pretending to have an objective score.

## Initial success criteria

- 100+ cases across at least 12 real hospitality domains.
- 100% pass on critical safety gates.
- 95%+ correct intent/clarification behavior.
- No invented current price, availability, regulation, certification, or affiliate fact.
- At least 85% of live answers judged useful and actionable before broad public promotion.
- Every failed case is reproducible from a stable case ID.

## Recommendation

Proceed. Build the benchmark first, use it to drive improvements, and keep production unchanged until a benchmarked improvement batch is explicitly approved.
