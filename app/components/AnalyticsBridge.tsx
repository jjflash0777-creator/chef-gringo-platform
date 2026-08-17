"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isCommercialEventName } from "../growth/commercial-events";

declare global {
  interface Window { dataLayer?: Record<string, unknown>[]; }
}

const ATTRIBUTION_KEY = "chefgringo:first-touch-attribution";
const SESSION_KEY = "chefgringo:anonymous-session";
const COMMERCIAL_PROFILE_KEY = "chefgringo:commercial-profile";

export type FirstTouchAttribution = {
  source: string | null;
  medium: string | null;
  campaignId: string | null;
  term: string | null;
  content: string | null;
  referrerHost: string | null;
  landingPage: string;
};

function createAnonymousSessionId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function readAttribution(): FirstTouchAttribution | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(window.sessionStorage.getItem(ATTRIBUTION_KEY) || "null") as FirstTouchAttribution | null; }
  catch { return null; }
}

function captureAttribution(): FirstTouchAttribution {
  const existing = readAttribution();
  if (existing) return existing;
  const params = new URLSearchParams(window.location.search);
  let referrerHost: string | null = null;
  try { referrerHost = document.referrer ? new URL(document.referrer).hostname : null; } catch { /* invalid referrer is ignored */ }
  const attribution = {
    source: params.get("utm_source"),
    medium: params.get("utm_medium"),
    campaignId: params.get("utm_campaign"),
    term: params.get("utm_term"),
    content: params.get("utm_content"),
    referrerHost,
    landingPage: `${window.location.pathname}${window.location.search}`.slice(0, 500),
  };
  window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  return attribution;
}

export function commercialSessionContext() {
  if (typeof window === "undefined") return { anonymousSessionId: null, attribution: null };
  let anonymousSessionId = window.sessionStorage.getItem(SESSION_KEY);
  if (!anonymousSessionId) {
    anonymousSessionId = createAnonymousSessionId();
    window.sessionStorage.setItem(SESSION_KEY, anonymousSessionId);
  }
  return { anonymousSessionId, attribution: captureAttribution() };
}

export type CommercialProfile = { intentKind: string; workflowId: string; confidence: string; updatedAt: string };

export function rememberCommercialIntent(profile: Omit<CommercialProfile, "updatedAt">) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(COMMERCIAL_PROFILE_KEY, JSON.stringify({ ...profile, updatedAt: new Date().toISOString() }));
}

export function readCommercialProfile(): CommercialProfile | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(window.sessionStorage.getItem(COMMERCIAL_PROFILE_KEY) || "null") as CommercialProfile | null; }
  catch { return null; }
}

export function trackEvent(name: string, details: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const payload = { event: name, ...details };
  window.dataLayer?.push(payload);
  window.dispatchEvent(new CustomEvent("chefgringo:analytics", { detail: payload }));
}

export function trackCommercialEvent(name: string, details: Record<string, unknown> = {}) {
  if (!isCommercialEventName(name)) throw new Error(`Unsupported commercial analytics event: ${name}`);
  trackEvent(name, details);
  if (typeof window !== "undefined") {
    const { anonymousSessionId, attribution } = commercialSessionContext();
    void fetch("/api/commercial-events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        ...details,
        eventType: name,
        occurredAt: new Date().toISOString(),
        anonymousSessionId,
        source: details.source || attribution?.source || undefined,
        channel: details.channel || attribution?.medium || undefined,
        campaignId: details.campaignId || attribution?.campaignId || undefined,
        metadata: { ...(typeof details.metadata === "object" && details.metadata ? details.metadata : {}), attribution },
      }),
    }).catch(() => undefined);
  }
}

export function AnalyticsBridge() {
  const pathname = usePathname();
  useEffect(() => trackCommercialEvent("page_view", { pagePath: pathname }), [pathname]);
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>("[data-event]");
      if (target?.dataset.event) {
        if (isCommercialEventName(target.dataset.event)) trackCommercialEvent(target.dataset.event, { pagePath: window.location.pathname });
        else trackEvent(target.dataset.event);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);
  return null;
}
