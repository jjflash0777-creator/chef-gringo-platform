"use client";

import { useState } from "react";
import styles from "./growth-factory.module.css";

type Package = {
  version: string;
  title: string;
  destinationPath: string;
  sourceUrl: string;
  campaignSlug: string;
  imageUrl: string;
  facebook: string;
  instagram: string;
  pinterest: string;
  reelScript: string;
  carouselSlides: string[];
  visualBrief: string;
  newsletterSubject: string;
  newsletterTeaser: string;
  generatedBy: "ai" | "fallback";
  fallbackReason: null | "ai_not_configured" | "ai_provider_error" | "invalid_ai_response";
  providerStatus: number | null;
  providerErrorCode: string | null;
};

const CHANNELS = ["facebook", "instagram", "pinterest"] as const;

export function GrowthFactory() {
  const [pkg, setPkg] = useState<Package | null>(null);
  const [status, setStatus] = useState("Ready.");
  const [selected, setSelected] = useState<string[]>([...CHANNELS]);

  async function generate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Reading the Chef Gringo page and generating the package…");
    setPkg(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/growth/factory/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: String(form.get("title") ?? ""),
        destinationPath: String(form.get("destinationPath") ?? ""),
        imageUrl: String(form.get("imageUrl") ?? ""),
      }),
    });
    const body = await response.json() as { error?: string; package?: Package };
    if (!response.ok || !body.package) {
      setStatus(body.error ?? "Generation failed.");
      return;
    }
    setPkg(body.package);
    setStatus(body.package.generatedBy === "ai"
      ? "AI package generated. Review, edit, then schedule."
      : `AI failed (${body.package.fallbackReason ?? "unknown"}${body.package.providerStatus ? `, HTTP ${body.package.providerStatus}` : ""}${body.package.providerErrorCode ? `, ${body.package.providerErrorCode}` : ""}). Scheduling disabled until real AI generation succeeds.`);
  }

  function patch<K extends keyof Package>(key: K, value: Package[K]) {
    setPkg((current) => current ? { ...current, [key]: value } : current);
  }

  async function schedule() {
    if (!pkg) return;
    if (pkg.generatedBy !== "ai") {
      setStatus("A fallback draft is not approved for scheduling. Fix the AI provider and generate a fresh package.");
      return;
    }
    const dueAt = (document.querySelector("#growth-factory-due-at") as HTMLInputElement | null)?.value;
    if (!dueAt) {
      setStatus("Choose a schedule time first.");
      return;
    }
    setStatus("Scheduling the approved package in Buffer…");
    const response = await fetch("/api/social/buffer/schedule", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        campaignSlug: pkg.campaignSlug,
        title: pkg.title,
        destinationPath: pkg.destinationPath,
        mediaUrl: pkg.imageUrl,
        dueAt: new Date(dueAt).toISOString(),
        channels: selected,
        copy: {
          facebook: pkg.facebook,
          instagram: pkg.instagram,
          pinterest: pkg.pinterest,
        },
      }),
    });
    const body = await response.json() as Record<string, unknown>;
    if (!response.ok) {
      setStatus(String(body.error ?? "Buffer scheduling failed."));
      return;
    }
    setStatus(`Scheduled successfully: ${JSON.stringify(body.scheduled)}`);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Founder tools · Growth Factory v1</p>
        <h1>One page in. A week of assets out.</h1>
        <p>Chef Gringo reads its own published page, drafts platform-native content, and prepares the approved package for Buffer.</p>
      </header>

      <form onSubmit={generate} className={styles.panel}>
        <label>Internal title<input name="title" placeholder="Carbonara — It’s All About Technique" /></label>
        <label>Published Chef Gringo path<input name="destinationPath" required placeholder="/knowledge/dishes/carbonara" /></label>
        <label>Permanent Chef Gringo image URL<input name="imageUrl" type="url" required placeholder="https://chefgringo.com/brand/campaigns/..." /></label>
        <button className={styles.primary} type="submit">Generate growth package</button>
      </form>

      <p className={styles.status} role="status">{status}</p>

      {pkg && (
        <section className={styles.workspace}>
          <div className={styles.meta}>
            <div><span>Generator</span><strong>{pkg.generatedBy}{pkg.fallbackReason ? ` · ${pkg.fallbackReason}` : ""}{pkg.providerStatus ? ` · HTTP ${pkg.providerStatus}` : ""}{pkg.providerErrorCode ? ` · ${pkg.providerErrorCode}` : ""}</strong></div>
            <div><span>Campaign</span><strong>{pkg.campaignSlug}</strong></div>
            <div><span>Destination</span><strong>{pkg.destinationPath}</strong></div>
          </div>

          <div className={styles.grid}>
            <label>Facebook<textarea rows={12} value={pkg.facebook} onChange={(e) => patch("facebook", e.target.value)} /></label>
            <label>Instagram<textarea rows={12} value={pkg.instagram} onChange={(e) => patch("instagram", e.target.value)} /></label>
            <label>
              Pinterest <small>{pkg.pinterest.length}/220 before tracked URL</small>
              <textarea rows={7} maxLength={220} value={pkg.pinterest} onChange={(e) => patch("pinterest", e.target.value)} />
            </label>
            <label>Reel script<textarea rows={12} value={pkg.reelScript} onChange={(e) => patch("reelScript", e.target.value)} /></label>
            <label>Visual brief<textarea rows={9} value={pkg.visualBrief} onChange={(e) => patch("visualBrief", e.target.value)} /></label>
            <label>Newsletter teaser<textarea rows={9} value={pkg.newsletterTeaser} onChange={(e) => patch("newsletterTeaser", e.target.value)} /></label>
          </div>

          <section className={styles.carousel}>
            <h2>5-slide carousel</h2>
            {pkg.carouselSlides.map((slide, index) => (
              <label key={index}>Slide {index + 1}<input value={slide} onChange={(e) => {
                const slides = [...pkg.carouselSlides];
                slides[index] = e.target.value;
                patch("carouselSlides", slides);
              }} /></label>
            ))}
          </section>

          <section className={styles.schedule}>
            <div>
              <h2>Approve + schedule</h2>
              <p>Nothing publishes until you press the scheduling button.</p>
            </div>
            <label>Publish date & time<input id="growth-factory-due-at" type="datetime-local" /></label>
            <fieldset>
              <legend>Connected channels</legend>
              {CHANNELS.map((channel) => (
                <label key={channel} className={styles.check}>
                  <input
                    type="checkbox"
                    checked={selected.includes(channel)}
                    onChange={(event) => setSelected((current) =>
                      event.target.checked ? [...new Set([...current, channel])] : current.filter((item) => item !== channel)
                    )}
                  />
                  {channel}
                </label>
              ))}
            </fieldset>
            <button className={styles.primary} type="button" onClick={schedule} disabled={!selected.length || pkg.generatedBy !== "ai"}>
              Schedule approved package
            </button>
          </section>
        </section>
      )}
    </main>
  );
}
