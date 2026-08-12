import assert from "node:assert/strict";
import test from "node:test";
import { acquireFirstPartyPages, selectFirstPartyResearchLinks } from "../scripts/affiliate-worker/browser-research.mjs";
import { applyResearchPages, extractCanonicalFindings } from "../scripts/affiliate-worker/research.mjs";
import { createDiscoveredPartnerCandidate } from "../scripts/affiliate-worker/run.mjs";
import { attachPartnerEvidence } from "../scripts/affiliate-worker/evidence.mjs";
import { researchDiscoveredPartner } from "../scripts/affiliate-worker/live-research.mjs";

const candidate = () => createDiscoveredPartnerCandidate({ providerName: "Toast", website: "https://pos.toasttab.com" });
const home = { url: "https://pos.toasttab.com/", title: "Toast POS", text: "Toast POS", links: [{ text: "Toast Advocates", href: "https://pos.toasttab.com/advocates" }, { text: "Partner Directory", href: "https://pos.toasttab.com/partners/directory" }, { text: "Affiliate blog", href: "https://example.com/toast" }] };
const advocates = { url: "https://pos.toasttab.com/advocates", title: "Toast Advocates", text: "Toast Advocates. Love Toast? Our referral program loves you back. US-based advocates. Join Now.", links: [{ text: "Terms and Conditions", href: "https://pos.toasttab.com/legal/toast-advocates-terms" }] };
const terms = { url: "https://pos.toasttab.com/toast-advocates-terms", title: "US Toast Advocates Program Terms", text: "US Toast Advocates Program Terms & Conditions. Program Eligibility. Eligible consultants and friends in the United States. Bonus Payouts. Eligible Advocates may receive a $1,000 bonus payout for each Qualified Referral. Verbal referrals will not be accepted. Toast will determine, in its sole discretion, whether a referral is a Qualified Referral. Completing the Refer a Business Form available on the Toast website.", links: [] };

function fakeBrowser(pages, failure = null) {
  return { read(url) { if (failure) throw failure; const key = Object.keys(pages).find((item) => url.includes(item)); if (!key) throw new Error("fixture page unavailable"); return structuredClone(pages[key]); } };
}

test("adapter discovers only first-party research links and prioritizes Advocates", () => {
  assert.deepEqual(selectFirstPartyResearchLinks(home.url, home.links).slice(0, 2), ["https://pos.toasttab.com/advocates", "https://pos.toasttab.com/partners/directory"]);
});

test("browser findings must pass through evidence ingestion before verification", () => {
  const raw = extractCanonicalFindings(advocates, "2026-08-12");
  assert.equal(raw.some((item) => "id" in item), false);
  assert.equal(candidate().verification.programExists, false);
  const attached = attachPartnerEvidence(candidate(), raw.find((item) => item.claimType === "program_exists"));
  assert.match(attached.evidence[0].id, /^partner-evidence:/);
});

test("normalized browser output cannot directly set verification flags", () => {
  const raw = extractCanonicalFindings(advocates, "2026-08-12");
  assert.equal(raw.some((item) => "verification" in item || "programExists" in item), false);
});

test("bounded acquisition follows Toast-owned pages without external write actions", () => {
  const acquisition = acquireFirstPartyPages({ website: home.url, browser: fakeBrowser({ "pos.toasttab.com/advocates": advocates, "toast-advocates-terms": terms, "pos.toasttab.com": home }) });
  assert.deepEqual(acquisition.visitedUrls, [home.url, advocates.url, terms.url]);
  assert.deepEqual(acquisition.actions, ["navigate", "read_visible_text", "inspect_links"]);
  assert.equal(acquisition.externalWrites, false);
});

test("live worker composes discovery, evidence, verification, and canonical readiness", () => {
  const result = researchDiscoveredPartner({
    providerName: "Toast",
    website: home.url,
    browser: fakeBrowser({ "pos.toasttab.com/advocates": advocates, "toast-advocates-terms": terms, "pos.toasttab.com": home }),
  });
  assert.equal(result.candidate.verification.programExists, true);
  assert.equal(result.readiness.apply.ready, false);
  assert.equal(result.readiness.outreach.ready, false);
  assert.equal(result.readiness.canAppearVerified, false);
  assert.equal(result.acquisition.externalWrites, false);
});

test("third-party evidence cannot satisfy first-party commercial verification", () => {
  const thirdParty = { ...terms, url: "https://affiliate-blog.example/toast", links: [] };
  const result = applyResearchPages(candidate(), { pages: [thirdParty], visitedUrls: [thirdParty.url], failures: [], actions: ["navigate", "read_visible_text"], externalWrites: false }, "2026-08-12");
  assert.equal(result.candidate.verification.payoutVerified, false);
});

test("missing claims and research failures never fabricate evidence", () => {
  const empty = applyResearchPages(candidate(), { pages: [{ url: home.url, title: "Toast", text: "No relevant program facts.", links: [] }], visitedUrls: [home.url], failures: [], actions: ["navigate", "read_visible_text"], externalWrites: false }, "2026-08-12");
  assert.deepEqual(empty.candidate.evidence, []);
  const failed = acquireFirstPartyPages({ website: home.url, browser: fakeBrowser({}, new Error("browser unavailable")) });
  const safelyUsable = applyResearchPages(candidate(), failed, "2026-08-12");
  assert.deepEqual(safelyUsable.candidate, candidate());
  assert.equal(failed.failures.length, 1);
});

test("malformed URLs are rejected and contradictory evidence still fails closed", () => {
  assert.throws(() => selectFirstPartyResearchLinks("javascript:alert(1)", []));
  const supporting = extractCanonicalFindings(advocates, "2026-08-12").find((item) => item.claimType === "program_exists");
  const conflict = { ...supporting, sourceUrl: "https://pos.toasttab.com/advocates/notice", claim: "Toast states the program is unavailable.", contradiction: true };
  const withBoth = attachPartnerEvidence(attachPartnerEvidence(candidate(), supporting), conflict);
  const result = applyResearchPages(withBoth, { pages: [], visitedUrls: [], failures: [], actions: [], externalWrites: false }, "2026-08-12");
  assert.equal(result.candidate.verification.programExists, false);
  assert.equal(result.conflicts.length, 1);
});
