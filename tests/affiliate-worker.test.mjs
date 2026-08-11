import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { COMMERCIAL_LANES } from "../app/growth/types.ts";
import { canAppearVerified, PARTNER_LIFECYCLE_STATES, PROGRAM_RELATIONSHIP_TYPES, readiness } from "../app/growth/partner-hunt.ts";
import { createDiscoveredPartnerCandidate } from "../scripts/affiliate-worker/run.mjs";

const discovery = { providerName: "Toast", website: "https://pos.toasttab.com" };

test("Toast discovery becomes a deterministic canonical Partner Hunt candidate", () => {
  const first = createDiscoveredPartnerCandidate(discovery);
  const repeated = createDiscoveredPartnerCandidate(discovery);

  assert.deepEqual(repeated, first);
  assert.equal(first.id, "partner:toast:pos-toasttab-com");
  assert.equal(first.providerName, "Toast");
  assert.equal(first.website, "https://pos.toasttab.com");
  assert.equal(first.commercialLane, "unknown");
  assert.equal(first.programType, "unknown");
  assert.ok(COMMERCIAL_LANES.includes(first.commercialLane));
  assert.ok(PROGRAM_RELATIONSHIP_TYPES.includes(first.programType));
  assert.ok(PARTNER_LIFECYCLE_STATES.includes(first.lifecycle));
  assert.equal(first.lifecycle, "discovered");
  assert.equal(first.synthetic, false);
  assert.equal(first.rejectedReason, null);
});

test("new discovery is neither application-ready nor verified", () => {
  const candidate = createDiscoveredPartnerCandidate(discovery);
  const application = readiness(candidate, "apply");

  assert.equal(application.ready, false);
  assert.match(application.missing.join(" | "), /Resolve company identity/);
  assert.match(application.missing.join(" | "), /Attach evidence/);
  assert.match(application.missing.join(" | "), /Record the application route/);
  assert.match(application.missing.join(" | "), /Verify that the program exists/);
  assert.match(application.missing.join(" | "), /Classify the commercial lane/);
  assert.match(application.missing.join(" | "), /Classify the program type/);
  assert.equal(readiness(candidate, "outreach").ready, false);
  assert.equal(canAppearVerified(candidate), false);
});

test("all research-dependent commercial facts remain unknown", () => {
  const candidate = createDiscoveredPartnerCandidate(discovery);

  assert.ok(Object.values(candidate.economics).every((value) => value === null));
  assert.ok(Object.values(candidate.verification).every((value) => value === false));
  assert.deepEqual(candidate.evidence, []);
  assert.equal(candidate.usAvailability, null);
  assert.equal(candidate.contactOrApplicationRoute, null);
  assert.equal(candidate.proposedRelationship, null);
  assert.equal(candidate.majorRestrictionsUnderstood, false);
  assert.equal(candidate.customerValueThesis, "");
  assert.equal(candidate.whyItMatters, "");
});

test("CLI emits the same candidate and rejects unsafe URL schemes", () => {
  const workerPath = fileURLToPath(new URL("../scripts/affiliate-worker/run.mjs", import.meta.url));
  const output = execFileSync(process.execPath, [workerPath, "Toast", "https://pos.toasttab.com"], { encoding: "utf8" });
  assert.deepEqual(JSON.parse(output), createDiscoveredPartnerCandidate(discovery));
  assert.throws(() => createDiscoveredPartnerCandidate({ providerName: "Toast", website: "javascript:alert(1)" }), /http or https/);
});
