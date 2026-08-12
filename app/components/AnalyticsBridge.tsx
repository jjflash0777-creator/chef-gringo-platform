"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isCommercialEventName } from "../growth/commercial-events";

declare global {
  interface Window { dataLayer?: Record<string, unknown>[]; }
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
    const sessionKey = "chefgringo:anonymous-session";
    let anonymousSessionId = window.sessionStorage.getItem(sessionKey);
    if (!anonymousSessionId) {
      anonymousSessionId = crypto.randomUUID();
      window.sessionStorage.setItem(sessionKey, anonymousSessionId);
    }
    void fetch("/api/commercial-events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ ...details, eventType: name, occurredAt: new Date().toISOString(), anonymousSessionId }),
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
