import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyLiveSourceDetails,
  classifyLiveSourceType,
} from "../app/lib/research/live-candidate-provider.ts";
import {
  clusterPublisherKey,
  registrableDomain,
  resolvePublisherIdentity,
} from "../app/lib/research/publisher-identity.ts";
import {
  SOCIAL_PUBLISH_AVAILABLE,
  authorityClassFromSourceMetadata,
  independenceCluster,
  rankCandidateAssessments,
} from "../app/growth/social/index.ts";

function clusterOf(identity) {
  return independenceCluster({
    ref: { kind: "corpus_document", id: `https://${identity.hostname}/doc` },
    publisher: identity.independencePublisher,
    canonicalUrl: `https://${identity.hostname}/doc`,
    underlyingDocumentId: `https://${identity.hostname}/doc`,
  });
}

test("cache and docs subdomains resolve to the registrable publisher, not Cache or Docs", () => {
  const cache = resolvePublisherIdentity({
    hostname: "cache.industry.harbor-industrial.example",
    url: "https://cache.industry.harbor-industrial.example/files/SA_SizingGuide.pdf",
    title: "Harbor Industrial Generator Sizing Guide",
    pdf: true,
  });
  assert.equal(registrableDomain("cache.industry.harbor-industrial.example"), "harbor-industrial.example");
  assert.equal(cache.publisher, "Harbor Industrial");
  assert.notEqual(cache.publisher, "Cache");
  assert.equal(cache.basis, "registrable_domain");
  assert.equal(cache.sourceType, "manufacturer_documentation");
  assert.equal(authorityClassFromSourceMetadata({ sourceType: cache.sourceType }), "manufacturer_technical");
  const docs = resolvePublisherIdentity({
    hostname: "docs.harbor-industrial.example",
    url: "https://docs.harbor-industrial.example/manuals/installation-manual.pdf",
    title: "Installation manual",
    pdf: true,
  });
  const support = resolvePublisherIdentity({
    hostname: "support.harbor-industrial.example",
    url: "https://support.harbor-industrial.example/manuals/installation-manual.pdf",
    title: "Installation manual",
    pdf: true,
  });
  assert.equal(docs.publisher, "Harbor Industrial");
  assert.equal(support.publisher, "Harbor Industrial");
  assert.equal(clusterOf(docs), clusterOf(support));
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
});

test("compound public suffixes keep the organization label, not Co", () => {
  const identity = resolvePublisherIdentity({
    hostname: "docs.northwind-power.co.uk",
    url: "https://docs.northwind-power.co.uk/manuals/installation-manual.pdf",
    title: "Installation manual",
    pdf: true,
  });
  assert.equal(registrableDomain("docs.northwind-power.co.uk"), "northwind-power.co.uk");
  assert.equal(identity.publisher, "Northwind Power");
  assert.notEqual(identity.publisher, "Co");
  assert.notEqual(identity.publisher, "Docs");
  assert.equal(identity.sourceType, "manufacturer_documentation");
});

test("manufacturer blogs stay editorial and title tokens do not invent a publisher", () => {
  assert.equal(classifyLiveSourceType({
    hostname: "www.harbor-industrial.example",
    url: "https://www.harbor-industrial.example/blog/understanding-load-calculations",
    title: "Understanding Load Calculations",
  }), "manufacturer_editorial");
  const titled = resolvePublisherIdentity({
    hostname: "www.cdn-files.example",
    url: "https://www.cdn-files.example/files/SA_SizingGuide.pdf",
    title: "Globex Generator Sizing Guide",
    pdf: true,
  });
  assert.equal(titled.publisher, "Cdn Files");
  assert.notEqual(titled.publisher, "Globex");
  assert.equal(titled.basis, "registrable_domain");
});

test("distributor-hosted OEM manuals keep the issuer and do not create fake independence", () => {
  const official = classifyLiveSourceDetails({
    hostname: "docs.harbor-industrial.example",
    url: "https://docs.harbor-industrial.example/files/installation-manual.pdf",
    title: "Installation manual",
    metadataAuthor: "Harbor Industrial Power",
    pdf: true,
  });
  const mirror = classifyLiveSourceDetails({
    hostname: "www.dealer-supply.example",
    url: "https://www.dealer-supply.example/files/installation-manual.pdf",
    title: "Installation manual",
    metadataAuthor: "Harbor Industrial Power",
    pdf: true,
  });
  assert.equal(official.sourceType, "manufacturer_documentation");
  assert.equal(mirror.sourceType, "distributor_documentation");
  assert.equal(mirror.issuer, "Harbor Industrial Power");
  assert.equal(official.independencePublisher, mirror.independencePublisher);
  assert.equal(clusterOf(official), clusterOf(mirror));
  assert.equal(authorityClassFromSourceMetadata({ sourceType: mirror.sourceType }), "primary_documentation");
});

test("conflicting metadata and generic hosts fail closed instead of promoting authority", () => {
  const conflict = resolvePublisherIdentity({
    hostname: "www.harbor-industrial.example",
    url: "https://www.harbor-industrial.example/docs/installation-manual.pdf",
    title: "Installation manual",
    metadataAuthor: "Globex Manufacturing Desk",
    pdf: true,
  });
  assert.equal(conflict.basis, "conflicting_metadata");
  assert.ok(conflict.conflict);
  assert.notEqual(conflict.sourceType, "manufacturer_documentation");
  assert.equal(authorityClassFromSourceMetadata({ sourceType: conflict.sourceType }), "editorial");
  const ambiguous = resolvePublisherIdentity({
    hostname: "docs.example-user.github.io",
    url: "https://docs.example-user.github.io/manuals/installation-manual.pdf",
    title: "Installation manual",
    pdf: true,
  });
  assert.equal(ambiguous.genericHost, true);
  assert.equal(ambiguous.basis, "ambiguous_host");
  assert.notEqual(ambiguous.sourceType, "manufacturer_documentation");
  assert.equal(clusterPublisherKey("Harbor Industrial AG"), clusterPublisherKey("Harbor Industrial"));
});

test("economics fields cannot alter publisher identity or ranking", () => {
  const identity = resolvePublisherIdentity({
    hostname: "www.harbor-industrial.example",
    url: "https://www.harbor-industrial.example/application-notes/headroom",
    title: "Harbor Industrial Power application note",
  });
  assert.equal(identity.sourceType, "manufacturer_documentation");
  const candidate = {
    canonicalUrl: "https://www.harbor-industrial.example/application-notes/headroom",
    title: "Harbor Industrial Power application note",
    publisher: identity.publisher,
    sourceClass: identity.sourceType,
    provenance: "live_fetch",
    independenceCluster: clusterOf(identity),
    excerpts: [],
    relationship: "supports",
    scopeLimitations: "Live-retrieved excerpt. Not accepted evidence.",
    authorityClass: "manufacturer_technical",
    authorityAdequate: true,
    freshness: "current",
    rankScore: 0,
    reasonSelected: null,
    reasonExcluded: null,
    proposedForReview: false,
    query: "headroom",
    retrievedChecksum: "fnv:1:1",
    publishedDate: null,
  };
  assert.throws(() => rankCandidateAssessments({
    candidates: [candidate],
    existingClusters: [],
    economics: { commission: 12, affiliatePayout: 3 },
  }), /commercial economics/);
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
});
