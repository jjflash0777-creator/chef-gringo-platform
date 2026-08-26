/**
 * Registrable-domain publisher identity for live candidate assessment.
 * Worker-safe: no PSL package, no network, no brand allowlists.
 * Identity does not accept evidence or raise authority by itself.
 *
 * PDF Author is document-creator metadata, not automatically the issuer.
 * Only credible organizational metadata may override or conflict with a
 * strong registrable-domain identity.
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

export const METADATA_TRUST_CLASSES = [
  "organization",
  "person",
  "tool",
  "untrusted",
  "missing",
] as const;
export type MetadataTrust = typeof METADATA_TRUST_CLASSES[number];

export type LiveDocumentClass = "technical" | "editorial" | "affiliate" | "regulatory" | "unknown";

export type PublisherIdentity = {
  hostname: string;
  registrableDomain: string | null;
  publisher: string;
  issuer: string | null;
  documentAuthor: string | null;
  authorTrust: MetadataTrust;
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
  "akamaihd.net",
  "akamaized.net",
  "fastly.net",
  "azureedge.net",
  "sharepoint.com",
  "office.com",
  "dropbox.com",
  "box.com",
  "cloudflare.net",
]);

const TOOL_AUTHOR = /\b(adobe|acrobat|microsoft|word|writer|chrome|safari|preview|quartz|itext|reportlab|pdftk|ghostscript|libreoffice)\b/i;
const LEGAL_SUFFIX = /\b(ag|gmbh|inc|incorporated|llc|ltd|limited|corp|corporation|plc|sa|nv|bv|spa|srl)\b/gi;
const TECHNICAL_DOCUMENTATION = /\b(owner'?s?\s+manual|service\s+manual|installation\s+manual|user\s+manual|operator'?s?\s+manual|datasheet|data[\s-]?sheet|spec[\s-]?sheet|specifications?|application[\s-]?notes?|application[\s-]?guides?|installation[\s-]?guides?|engineering\s+guides?|service\s+documentation|technical\s+bulletins?|product\s+bulletins?|installation\s+instructions?)\b/i;
const SIZING_GUIDE = /\bsizing\s+guides?\b/i;
const EDITORIAL_EDUCATION = /\b(understanding|what\s+is|how\s+to|learn|explainer|faq|education|buyer'?s?\s+guide|complete\s+guide|ultimate\s+guide)\b/i;
const BLOG_PATH = /\/(blog|news|articles?|insights|press)\b/i;
const DOCUMENT_PATH = /\/(docs?|documentation|manuals?|support|files|download|downloads|assets)\b/i;
const LMS_PATH = /\/(lms|scorm|courseware|elearning|learning-catalog|catalog\/courses)\b/i;
const DISTRIBUTOR = /\b(distributor|wholesale|dealer|supply-house|supplyhouse|reseller)\b/i;
const AFFILIATE = /affiliate|deals|coupon|shop-now|sponsored/;
const FORUM = /\b(forum|medium\.com|wordpress|substack)\b/i;
const RECOGNIZED_ORG = /\b(ieee\.org|nfpa\.org|asme\.org|iec\.ch|ul\.com|ansi\.org|ashrae\.org|sae\.org)\b/i;
const DOCUMENT_TITLE_STOP = /^(sizing|guide|guides|manual|manuals|datasheet|application|installation|specification|specifications|bulletin|booklet|pdf|instructions?|notes?)$/i;
const GENERIC_ORG_TOKENS = new Set([
  "global", "general", "united", "national", "international", "american", "standard",
  "industrial", "direct", "systems", "group", "company", "digital", "tech", "technology",
  "solutions", "services", "energy", "power", "super", "mega",
]);

export function publisherKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function clusterPublisherKey(value: string) {
  return publisherKey(value.replace(new RegExp(LEGAL_SUFFIX.source, "gi"), " ")).replace(/\s+/g, " ").trim();
}

export function compactOrgKey(value: string) {
  return clusterPublisherKey(value).replace(/\s+/g, "");
}

export function publishersAgree(left: string | null | undefined, right: string | null | undefined) {
  const a = clusterPublisherKey(left ?? "");
  const b = clusterPublisherKey(right ?? "");
  if (!a || !b) return false;
  if (a === b) return true;
  const aCompact = a.replace(/\s+/g, "");
  const bCompact = b.replace(/\s+/g, "");
  if (aCompact.length >= 4 && aCompact === bCompact) return true;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  const shorterWords = shorter.split(" ").filter(Boolean);
  if (shorterWords.length >= 2 || shorter.replace(/\s/g, "").length >= 8) {
    return longer.includes(shorter);
  }
  return false;
}

export function classifyMetadataTrust(value: string | null | undefined): MetadataTrust {
  if (!value) return "missing";
  const trimmed = value.replace(/\u0000/g, "").trim();
  if (!trimmed) return "missing";
  if (TOOL_AUTHOR.test(trimmed)) return "tool";
  if (trimmed.length < 3 || trimmed.length > 80) return "untrusted";
  if (new RegExp(LEGAL_SUFFIX.source, "i").test(trimmed) && /[a-z]/i.test(trimmed)) return "organization";
  const words = trimmed.split(/\s+/).filter(Boolean);
  const letterWords = words.filter((word) => /^[A-Za-z][A-Za-z.'-]*$/.test(word) && word.replace(/[^A-Za-z]/g, "").length >= 2);
  if (letterWords.length >= 2) return "organization";
  if (words.length === 1) {
    if (/[a-z][A-Z]/.test(trimmed) && trimmed.length <= 16) return "person";
    if (/\d/.test(trimmed) && trimmed.length <= 24) return "untrusted";
    if (/^[A-Z][a-z]{3,}$/.test(trimmed) || /^[A-Z]{4,}$/.test(trimmed)) return "organization";
    return "untrusted";
  }
  return "untrusted";
}

function rawMetadataValue(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.replace(/\u0000/g, "").trim();
  if (!trimmed || trimmed.length > 80) return null;
  return trimmed;
}

export function organizationMatchesDomain(org: string | null | undefined, domain: string | null | undefined) {
  if (!org || !domain) return false;
  const orgCompact = compactOrgKey(org);
  if (orgCompact.length < 4) return false;
  const sld = domain.split(".")[0] ?? "";
  const sldCompact = sld.replace(/-/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (sldCompact.length >= 4 && orgCompact === sldCompact) return true;
  const domainPublisher = displayPublisherFromDomain(domain, domain);
  if (publishersAgree(org, domainPublisher)) return true;
  if (compactOrgKey(domainPublisher) === orgCompact) return true;
  const firstLabel = (sld.split("-")[0] ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const orgWords = clusterPublisherKey(org).split(" ").filter((word) => word.length >= 3);
  const firstWord = orgWords[0] ?? "";
  if (
    firstWord.length >= 4
    && !GENERIC_ORG_TOKENS.has(firstWord)
    && (firstWord === sldCompact || firstWord === firstLabel)
  ) {
    return true;
  }
  return false;
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

function leadingOrgHint(title: string, metadataTitle?: string | null) {
  const text = `${metadataTitle || title || ""}`.trim();
  const tokens = text.split(/\s+/).filter(Boolean);
  const kept: string[] = [];
  for (const token of tokens) {
    const clean = token.replace(/[^A-Za-z0-9-]/g, "");
    if (!clean) break;
    if (DOCUMENT_TITLE_STOP.test(clean)) break;
    if (!/^[A-Z]/.test(clean)) break;
    kept.push(clean);
    if (kept.length >= 4) break;
  }
  if (!kept.length) return null;
  if (kept.length === 1 && DOCUMENT_TITLE_STOP.test(kept[0] ?? "")) return null;
  return kept.join(" ");
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

function credibleOrganizationName(value: string | null | undefined) {
  return classifyMetadataTrust(value) === "organization" ? rawMetadataValue(value) : null;
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
  const lmsHost = LMS_PATH.test(input.url);
  const genericHost = Boolean((domain && GENERIC_HOSTING.has(domain)) || lmsHost);
  const domainPublisher = displayPublisherFromDomain(domain, hostname);
  const hostnamePublisher = titleCaseLabel(hostname.split(".")[0] ?? hostname);
  const documentAuthor = rawMetadataValue(input.metadataAuthor);
  const authorTrust = classifyMetadataTrust(documentAuthor);
  const orgFromAuthor = credibleOrganizationName(documentAuthor);
  const orgFromSite = credibleOrganizationName(input.siteName);
  const orgMetadata = orgFromAuthor ?? orgFromSite;
  const orgBasis: PublisherIdentityBasis = orgFromAuthor ? "pdf_metadata_author" : "page_metadata";
  const documentClass = documentClassOf({
    url: input.url,
    title: input.title,
    metadataTitle: input.metadataTitle,
    pdf: input.pdf,
  });
  const titleHint = leadingOrgHint(input.title, input.metadataTitle);
  const titleDisagrees = Boolean(
    titleHint
    && domain
    && !organizationMatchesDomain(titleHint, domain)
    && !publishersAgree(titleHint, domainPublisher),
  );
  const thirdPartyHost = titleDisagrees;
  const hay = `${hostname} ${input.url} ${input.title} ${input.metadataTitle ?? ""} ${orgMetadata ?? ""}`.toLowerCase();

  let basis: PublisherIdentityBasis = domain ? "registrable_domain" : "hostname_fallback";
  let publisher = domain ? domainPublisher : hostnamePublisher;
  let issuer: string | null = domain && !genericHost && !thirdPartyHost ? domainPublisher : null;
  let conflict: string | null = null;
  const hostedElsewhere = genericHost || thirdPartyHost || DISTRIBUTOR.test(hay);

  if (orgMetadata && domain && organizationMatchesDomain(orgMetadata, domain)) {
    publisher = orgMetadata;
    issuer = orgMetadata;
    basis = orgBasis;
  } else if (orgMetadata && hostedElsewhere) {
    publisher = orgMetadata;
    issuer = orgMetadata;
    basis = orgBasis;
  } else if (orgMetadata && domain && !organizationMatchesDomain(orgMetadata, domain) && !genericHost) {
    conflict = `Document issuer "${orgMetadata}" does not match registrable domain ${domain}.`;
    basis = "conflicting_metadata";
    publisher = domainPublisher;
    issuer = null;
  } else if (genericHost || thirdPartyHost) {
    basis = "ambiguous_host";
    publisher = domain ? domainPublisher : hostnamePublisher;
    issuer = null;
    conflict = genericHost
      ? "Host is a generic sharing domain; publisher is ambiguous."
      : "Host appears to distribute a third-party document; author metadata is not a credible organization issuer.";
  } else if (!domain) {
    basis = "hostname_fallback";
    publisher = hostnamePublisher;
    issuer = hostnamePublisher;
  }

  const independencePublisher = clusterPublisherKey(issuer ?? publisher) || publisher;

  const identity = {
    hostname,
    registrableDomain: domain,
    publisher,
    issuer,
    documentAuthor,
    authorTrust,
    independencePublisher,
    basis,
    conflict,
    genericHost,
  };

  if (hostname.endsWith(".gov") || hostname.endsWith(".mil") || hostname.includes(".gov.")) {
    return {
      ...identity,
      publisher: domainPublisher,
      issuer: domainPublisher,
      independencePublisher: clusterPublisherKey(domainPublisher) || domainPublisher,
      basis: domain ? "registrable_domain" : "hostname_fallback",
      conflict: null,
      documentClass: "regulatory",
      sourceType: "regulatory_document",
    };
  }
  if (hostname.endsWith(".edu")) {
    return {
      ...identity,
      publisher: domainPublisher,
      issuer: domainPublisher,
      independencePublisher: clusterPublisherKey(domainPublisher) || domainPublisher,
      basis: domain ? "registrable_domain" : "hostname_fallback",
      conflict: null,
      documentClass: "editorial",
      sourceType: "educational_institution",
    };
  }
  if (RECOGNIZED_ORG.test(hay)) {
    return {
      ...identity,
      publisher: domainPublisher,
      issuer: domainPublisher,
      independencePublisher: clusterPublisherKey(domainPublisher) || domainPublisher,
      basis: domain ? "registrable_domain" : "hostname_fallback",
      conflict: null,
      documentClass: "regulatory",
      sourceType: "professional_organization_guidance",
    };
  }
  if (AFFILIATE.test(hay)) {
    return { ...identity, documentClass: "affiliate", sourceType: "affiliate_page" };
  }
  if (FORUM.test(hay)) {
    return { ...identity, documentClass: "editorial", sourceType: "editorial" };
  }

  const identityConflict = basis === "conflicting_metadata";
  const issuerAmbiguous = basis === "ambiguous_host" || Boolean((genericHost || thirdPartyHost) && !issuer);
  const distributor = DISTRIBUTOR.test(hay)
    || Boolean(issuer && domain && !organizationMatchesDomain(issuer, domain) && hostedElsewhere);
  let sourceType = "manufacturer_editorial";
  if (identityConflict || issuerAmbiguous) {
    sourceType = distributor ? "distributor_editorial" : "manufacturer_editorial";
  } else if (documentClass === "technical") {
    sourceType = distributor ? "distributor_documentation" : "manufacturer_documentation";
  } else if (documentClass === "editorial") {
    sourceType = distributor ? "distributor_editorial" : "manufacturer_editorial";
  } else if (distributor) {
    sourceType = "distributor_editorial";
  }

  return {
    ...identity,
    documentClass: documentClass === "unknown" ? "editorial" : documentClass,
    sourceType,
  };
}
