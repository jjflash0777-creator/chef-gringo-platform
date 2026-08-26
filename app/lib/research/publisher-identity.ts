/**
 * Registrable-domain publisher identity for live candidate assessment.
 * Worker-safe: no PSL package, no network, no brand allowlists.
 * Identity does not accept evidence or raise authority by itself.
 */

import { urlLooksLikePdf } from "./pdf-detect.ts";

export const PUBLISHER_IDENTITY_BASES = [
  "pdf_metadata_author",
  "page_metadata",
  "registrable_domain",
  "hostname_fallback",
  "conflicting_metadata",
  "ambiguous_host",
] as const;
export type PublisherIdentityBasis = typeof PUBLISHER_IDENTITY_BASES[number];

export type LiveDocumentClass = "technical" | "editorial" | "affiliate" | "regulatory" | "unknown";

export type PublisherIdentity = {
  hostname: string;
  registrableDomain: string | null;
  publisher: string;
  issuer: string | null;
  independencePublisher: string;
  basis: PublisherIdentityBasis;
  conflict: string | null;
  documentClass: LiveDocumentClass;
  sourceType: string;
  genericHost: boolean;
};

const COMPOUND_PUBLIC_SUFFIXES = new Set([
  "co.uk", "org.uk", "ac.uk", "gov.uk", "net.uk", "me.uk", "sch.uk", "ltd.uk", "plc.uk",
  "co.jp", "or.jp", "ne.jp", "ac.jp", "go.jp", "gr.jp",
  "com.au", "net.au", "org.au", "edu.au", "gov.au", "asn.au", "id.au",
  "co.nz", "org.nz", "net.nz", "govt.nz", "ac.nz",
  "co.za", "org.za", "net.za", "gov.za", "ac.za",
  "com.br", "org.br", "gov.br", "net.br",
  "co.in", "net.in", "org.in", "gov.in", "ac.in", "res.in",
  "com.mx", "org.mx", "gob.mx",
  "com.sg", "com.hk", "com.tw", "com.tr", "com.ar", "com.pe", "com.ph",
  "co.kr", "or.kr", "ac.kr", "go.kr",
  "com.cn", "org.cn", "gov.cn", "net.cn", "ac.cn",
  "co.il", "org.il", "ac.il", "gov.il",
  "com.pt", "co.th", "in.th", "co.id", "co.ke", "com.ng",
]);

const GENERIC_HOSTING = new Set([
  "amazonaws.com",
  "cloudfront.net",
  "googleusercontent.com",
  "github.io",
  "azurewebsites.net",
  "windows.net",
  "herokuapp.com",
  "netlify.app",
  "vercel.app",
  "pages.dev",
  "r2.dev",
  "wordpress.com",
  "blogspot.com",
]);

const TOOL_AUTHOR = /\b(adobe|acrobat|microsoft|word|writer|chrome|safari|preview|quartz|itext|reportlab|pdftk|ghostscript|libreoffice)\b/i;
const LEGAL_SUFFIX = /\b(ag|gmbh|inc|incorporated|llc|ltd|limited|corp|corporation|plc|sa|nv|bv|spa|srl)\b/gi;
const TECHNICAL_DOCUMENTATION = /\b(owner'?s?\s+manual|service\s+manual|installation\s+manual|user\s+manual|operator'?s?\s+manual|datasheet|data[\s-]?sheet|spec[\s-]?sheet|specifications?|application[\s-]?notes?|application[\s-]?guides?|installation[\s-]?guides?|engineering\s+guides?|service\s+documentation|technical\s+bulletins?|product\s+bulletins?|installation\s+instructions?)\b/i;
const SIZING_GUIDE = /\bsizing\s+guides?\b/i;
const EDITORIAL_EDUCATION = /\b(understanding|what\s+is|how\s+to|learn|explainer|faq|education|buyer'?s?\s+guide|complete\s+guide|ultimate\s+guide)\b/i;
const BLOG_PATH = /\/(blog|news|articles?|insights|press)\b/i;
const DOCUMENT_PATH = /\/(docs?|documentation|manuals?|support|files|download|downloads|assets)\b/i;
const DISTRIBUTOR = /\b(distributor|wholesale|dealer|supply-house|supplyhouse|reseller)\b/i;
const AFFILIATE = /affiliate|deals|coupon|shop-now|sponsored/;
const FORUM = /\b(forum|medium\.com|wordpress|substack)\b/i;
const RECOGNIZED_ORG = /\b(ieee\.org|nfpa\.org|asme\.org|iec\.ch|ul\.com|ansi\.org|ashrae\.org|sae\.org)\b/i;

export function publisherKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function clusterPublisherKey(value: string) {
  return publisherKey(value.replace(LEGAL_SUFFIX, " ")).replace(/\s+/g, " ").trim();
}

export function publishersAgree(left: string | null | undefined, right: string | null | undefined) {
  const a = clusterPublisherKey(left ?? "");
  const b = clusterPublisherKey(right ?? "");
  if (!a || !b) return false;
  if (a === b) return true;
  return a.includes(b) || b.includes(a);
}

function identifiableName(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.replace(/\u0000/g, "").trim();
  if (!trimmed || TOOL_AUTHOR.test(trimmed)) return null;
  if (trimmed.length < 3 || trimmed.length > 80) return null;
  return trimmed;
}

function titleCaseLabel(label: string) {
  return label.replace(/[-_]+/g, " ").replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

export function registrableDomain(hostname: string | null | undefined): string | null {
  if (!hostname) return null;
  const host = hostname.replace(/\.$/, "").replace(/^www\./, "").toLowerCase();
  if (!host || host === "localhost") return null;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":")) return null;
  const labels = host.split(".").filter(Boolean);
  if (labels.length < 2) return host;
  const last2 = labels.slice(-2).join(".");
  if (COMPOUND_PUBLIC_SUFFIXES.has(last2) && labels.length >= 3) return labels.slice(-3).join(".");
  return last2;
}

export function displayPublisherFromDomain(domain: string | null, hostname: string) {
  const registrable = domain ?? hostname.replace(/^www\./, "").toLowerCase();
  const labels = registrable.split(".").filter(Boolean);
  const sld = labels.length >= 2 ? labels[0] : labels[0] ?? hostname;
  return titleCaseLabel(sld ?? hostname);
}

export function tokenizeDocumentLocator(url: string, title: string, metadataTitle?: string | null) {
  let path = url;
  try {
    path = new URL(url).pathname;
  } catch {
    path = url.split("?")[0] ?? url;
  }
  const spaced = path.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_\-./]+/g, " ");
  return `${title} ${metadataTitle ?? ""} ${spaced}`.replace(/\s+/g, " ").trim();
}

function documentClassOf(input: {
  url: string;
  title: string;
  metadataTitle?: string | null;
  pdf?: boolean;
}): LiveDocumentClass {
  const pdf = Boolean(input.pdf) || urlLooksLikePdf(input.url);
  const locator = tokenizeDocumentLocator(input.url, input.title, input.metadataTitle);
  const blog = BLOG_PATH.test(input.url);
  const docsPath = DOCUMENT_PATH.test(input.url);
  const technicalCore = TECHNICAL_DOCUMENTATION.test(locator);
  const sizing = SIZING_GUIDE.test(locator);
  const technical = technicalCore || ((pdf || docsPath) && sizing && !blog);
  const editorial = EDITORIAL_EDUCATION.test(locator) || blog || (sizing && !pdf && !docsPath && !technicalCore);
  if (blog && !pdf) return "editorial";
  if (technical) return "technical";
  if (editorial) return "editorial";
  return "unknown";
}

export type PublisherIdentityInput = {
  hostname: string;
  url: string;
  title: string;
  metadataTitle?: string | null;
  metadataAuthor?: string | null;
  siteName?: string | null;
  pdf?: boolean;
};

export function resolvePublisherIdentity(input: PublisherIdentityInput): PublisherIdentity {
  const hostname = input.hostname.replace(/^www\./, "").toLowerCase();
  const domain = registrableDomain(hostname);
  const genericHost = Boolean(domain && GENERIC_HOSTING.has(domain));
  const domainPublisher = displayPublisherFromDomain(domain, hostname);
  const hostnamePublisher = titleCaseLabel(hostname.split(".")[0] ?? hostname);
  const author = identifiableName(input.metadataAuthor);
  const siteName = identifiableName(input.siteName);
  const documentClass = documentClassOf({
    url: input.url,
    title: input.title,
    metadataTitle: input.metadataTitle,
    pdf: input.pdf,
  });
  const hay = `${hostname} ${input.url} ${input.title} ${input.metadataTitle ?? ""} ${author ?? ""}`.toLowerCase();

  let basis: PublisherIdentityBasis = domain ? "registrable_domain" : "hostname_fallback";
  let publisher = domain ? domainPublisher : hostnamePublisher;
  let issuer: string | null = null;
  let conflict: string | null = null;

  const named = author ?? siteName;
  if (named && domain && publishersAgree(named, domainPublisher)) {
    publisher = named;
    issuer = named;
    basis = author ? "pdf_metadata_author" : "page_metadata";
  } else if (named && (genericHost || DISTRIBUTOR.test(hay))) {
    publisher = named;
    issuer = named;
    basis = author ? "pdf_metadata_author" : "page_metadata";
  } else if (named && domain && !publishersAgree(named, domainPublisher) && !genericHost) {
    conflict = `Document issuer "${named}" does not match registrable domain ${domain}.`;
    basis = "conflicting_metadata";
    publisher = domainPublisher;
    issuer = null;
  } else if (genericHost) {
    basis = named ? (author ? "pdf_metadata_author" : "page_metadata") : "ambiguous_host";
    publisher = named ?? displayPublisherFromDomain(domain, hostname);
    issuer = named;
    if (!named) conflict = "Host is a generic sharing domain; publisher is ambiguous.";
  } else if (!domain) {
    basis = "hostname_fallback";
    publisher = hostnamePublisher;
  }

  const independencePublisher = clusterPublisherKey(issuer ?? publisher) || publisher;

  if (hostname.endsWith(".gov") || hostname.endsWith(".mil") || hostname.includes(".gov.")) {
    return {
      hostname, registrableDomain: domain, publisher: domainPublisher, issuer: domainPublisher,
      independencePublisher: clusterPublisherKey(domainPublisher) || domainPublisher,
      basis: domain ? "registrable_domain" : "hostname_fallback", conflict: null,
      documentClass: "regulatory", sourceType: "regulatory_document", genericHost,
    };
  }
  if (hostname.endsWith(".edu")) {
    return {
      hostname, registrableDomain: domain, publisher: domainPublisher, issuer: domainPublisher,
      independencePublisher: clusterPublisherKey(domainPublisher) || domainPublisher,
      basis: domain ? "registrable_domain" : "hostname_fallback", conflict: null,
      documentClass: "editorial", sourceType: "educational_institution", genericHost,
    };
  }
  if (RECOGNIZED_ORG.test(hay)) {
    return {
      hostname, registrableDomain: domain, publisher: domainPublisher, issuer: domainPublisher,
      independencePublisher: clusterPublisherKey(domainPublisher) || domainPublisher,
      basis: domain ? "registrable_domain" : "hostname_fallback", conflict: null,
      documentClass: "regulatory", sourceType: "professional_organization_guidance", genericHost,
    };
  }
  if (AFFILIATE.test(hay)) {
    return {
      hostname, registrableDomain: domain, publisher, issuer, independencePublisher,
      basis, conflict, documentClass: "affiliate", sourceType: "affiliate_page", genericHost,
    };
  }
  if (FORUM.test(hay)) {
    return {
      hostname, registrableDomain: domain, publisher, issuer, independencePublisher,
      basis, conflict, documentClass: "editorial", sourceType: "editorial", genericHost,
    };
  }

  const distributor = DISTRIBUTOR.test(hay) || Boolean(issuer && domain && !publishersAgree(issuer, domainPublisher));
  const ambiguous = basis === "ambiguous_host" || basis === "conflicting_metadata" || genericHost;
  let sourceType = "manufacturer_editorial";
  if (ambiguous) {
    sourceType = distributor ? "distributor_editorial" : "manufacturer_editorial";
  } else if (documentClass === "technical") {
    sourceType = distributor ? "distributor_documentation" : "manufacturer_documentation";
  } else if (documentClass === "editorial") {
    sourceType = distributor ? "distributor_editorial" : "manufacturer_editorial";
  } else if (distributor) {
    sourceType = "distributor_editorial";
  }

  return {
    hostname,
    registrableDomain: domain,
    publisher,
    issuer,
    independencePublisher,
    basis,
    conflict,
    documentClass: documentClass === "unknown" ? "editorial" : documentClass,
    sourceType,
    genericHost,
  };
}
