"use client";
import { trackEvent } from "./AnalyticsBridge";
export function PrintButton({ eventName, label = "Print recipe" }: { eventName?: string; label?: string }) {
  return <button className="button secondary print-button" type="button" onClick={() => { if (eventName) trackEvent(eventName); window.print(); }}>{label}</button>;
}
