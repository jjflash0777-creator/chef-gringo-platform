"use client";

import { useEffect } from "react";

declare global {
  interface Window { dataLayer?: Record<string, unknown>[]; }
}

export function trackEvent(name: string, details: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const payload = { event: name, ...details };
  window.dataLayer?.push(payload);
  window.dispatchEvent(new CustomEvent("chefgringo:analytics", { detail: payload }));
}

export function AnalyticsBridge() {
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>("[data-event]");
      if (target?.dataset.event) trackEvent(target.dataset.event);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);
  return null;
}
