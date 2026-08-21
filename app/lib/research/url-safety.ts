import { RESEARCH_LIMITS } from "./limits.ts";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
  "metadata.google.internal",
  "169.254.169.254",
  "metadata.internal",
]);

const BLOCKED_PROTOCOLS = new Set(["file:", "javascript:", "data:", "ftp:", "ws:", "wss:", "blob:"]);

export type UrlSafetyIssue =
  | "invalid_url"
  | "unsafe_protocol"
  | "blocked_host"
  | "private_network"
  | "redirect_to_blocked"
  | "unsupported_content_type"
  | "oversized"
  | "credentials_in_url";

export type UrlSafetyResult = {
  ok: boolean;
  url: string | null;
  canonicalUrl: string | null;
  hostname: string | null;
  issues: UrlSafetyIssue[];
};

function ipv4Parts(hostname: string) {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return null;
  const parts = match.slice(1).map(Number);
  if (parts.some((part) => part > 255)) return null;
  return parts;
}

export function isPrivateOrLocalHostname(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (BLOCKED_HOSTS.has(host)) return true;
  if (host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (host === "0" || host.startsWith("0.")) return true;
  const ipv4 = ipv4Parts(host);
  if (ipv4) {
    const [a, b] = ipv4;
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }
  if (host.includes(":")) {
    if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) return true;
  }
  return false;
}

export function canonicalizeUrl(value: string) {
  const parsed = new URL(value);
  parsed.hash = "";
  parsed.username = "";
  parsed.password = "";
  parsed.hostname = parsed.hostname.toLowerCase();
  for (const key of [...parsed.searchParams.keys()]) {
    if (/^utm_|^fbclid$|^gclid$/i.test(key)) parsed.searchParams.delete(key);
  }
  let path = parsed.pathname.replace(/\/{2,}/g, "/");
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  parsed.pathname = path || "/";
  return parsed.toString();
}

export function validateSourceUrl(value: string, options: { allowHttp?: boolean } = {}): UrlSafetyResult {
  const issues: UrlSafetyIssue[] = [];
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return { ok: false, url: null, canonicalUrl: null, hostname: null, issues: ["invalid_url"] };
  }
  if (parsed.username || parsed.password) issues.push("credentials_in_url");
  const protocol = parsed.protocol.toLowerCase();
  if (BLOCKED_PROTOCOLS.has(protocol) || (protocol !== "https:" && !(options.allowHttp && protocol === "http:"))) {
    issues.push("unsafe_protocol");
  }
  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(hostname)) issues.push("blocked_host");
  else if (isPrivateOrLocalHostname(hostname)) issues.push("private_network");
  const canonicalUrl = issues.includes("invalid_url") ? null : canonicalizeUrl(parsed.toString());
  return {
    ok: issues.length === 0,
    url: parsed.toString(),
    canonicalUrl,
    hostname,
    issues,
  };
}

export function validateRedirectChain(startUrl: string, hops: string[]) {
  const start = validateSourceUrl(startUrl);
  if (!start.ok) return { ok: false, issues: start.issues, finalUrl: null as string | null };
  const issues: UrlSafetyIssue[] = [];
  let current = startUrl;
  for (const hop of hops) {
    const next = validateSourceUrl(hop);
    if (!next.ok) {
      issues.push("redirect_to_blocked");
      issues.push(...next.issues);
      return { ok: false, issues: [...new Set(issues)], finalUrl: null as string | null };
    }
    current = next.canonicalUrl ?? hop;
  }
  return { ok: issues.length === 0, issues, finalUrl: current };
}

export function validateSourcePayload(input: { contentType?: string | null; byteLength: number }) {
  const issues: UrlSafetyIssue[] = [];
  if (input.byteLength > RESEARCH_LIMITS.maximumSourceBytes) issues.push("oversized");
  const type = (input.contentType ?? "text/plain").split(";")[0].trim().toLowerCase();
  const allowed = new Set(["text/plain", "text/markdown", "text/html", "application/pdf", "application/json"]);
  if (!allowed.has(type)) issues.push("unsupported_content_type");
  return { ok: issues.length === 0, issues, contentType: type };
}

export function urlsAreCanonicalDuplicates(left: string, right: string) {
  try {
    return canonicalizeUrl(left) === canonicalizeUrl(right);
  } catch {
    return false;
  }
}
