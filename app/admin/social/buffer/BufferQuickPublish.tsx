"use client";

import { useState } from "react";

const CHANNELS = ["facebook", "instagram", "pinterest", "tiktok"] as const;

export function BufferQuickPublish() {
  const [selected, setSelected] = useState<string[]>([...CHANNELS]);
  const [status, setStatus] = useState("Ready.");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Scheduling in Buffer…");
    setResult(null);
    const form = new FormData(event.currentTarget);
    const localDueAt = String(form.get("dueAt") ?? "");
    const payload = {
      campaignSlug: String(form.get("campaignSlug") ?? ""),
      title: String(form.get("title") ?? ""),
      destinationPath: String(form.get("destinationPath") ?? ""),
      mediaUrl: String(form.get("mediaUrl") ?? ""),
      dueAt: new Date(localDueAt).toISOString(),
      text: String(form.get("text") ?? ""),
      channels: selected,
    };
    try {
      const response = await fetch("/api/social/buffer/schedule", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json() as Record<string, unknown>;
      if (!response.ok) throw new Error(String(body.error ?? "Buffer scheduling failed."));
      setResult(body);
      setStatus("Scheduled successfully.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Buffer scheduling failed.");
    }
  }

  return (
    <main className="container narrow" style={{ paddingBlock: "3rem 5rem" }}>
      <p className="eyebrow">Founder tools · Buffer</p>
      <h1>Quick social publish</h1>
      <p className="lede">
        One approved Chef Gringo creative, one owned landing page, one time — scheduled to every selected Buffer channel.
      </p>

      <form onSubmit={submit} style={{ display: "grid", gap: "1rem", marginTop: "2rem" }}>
        <label>Campaign slug<input name="campaignSlug" required placeholder="bluetti-food-truck-power" /></label>
        <label>Internal title<input name="title" required placeholder="BLUETTI food-truck backup power" /></label>
        <label>Chef Gringo landing path<input name="destinationPath" required defaultValue="/go/bluetti" /></label>
        <label>Public image URL<input name="mediaUrl" type="url" required placeholder="https://chefgringo.com/brand/social/..." /></label>
        <label>Publish date & time<input name="dueAt" type="datetime-local" required /></label>
        <label>Post copy<textarea name="text" rows={10} required placeholder="Approved social caption…" /></label>

        <fieldset>
          <legend>Buffer channels</legend>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
            {CHANNELS.map((channel) => (
              <label key={channel} style={{ display: "inline-flex", alignItems: "center", gap: ".4rem" }}>
                <input
                  type="checkbox"
                  checked={selected.includes(channel)}
                  onChange={(event) => setSelected((current) =>
                    event.target.checked
                      ? [...new Set([...current, channel])]
                      : current.filter((item) => item !== channel)
                  )}
                />
                {channel}
              </label>
            ))}
          </div>
        </fieldset>

        <button className="button" type="submit" disabled={selected.length === 0}>Schedule all selected channels</button>
      </form>

      <p role="status" style={{ marginTop: "1rem" }}>{status}</p>
      {result && (
        <details open>
          <summary>Buffer result</summary>
          <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{JSON.stringify(result, null, 2)}</pre>
        </details>
      )}
    </main>
  );
}
