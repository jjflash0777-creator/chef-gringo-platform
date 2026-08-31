"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "./CulinaryPulse.module.css";

type Story = { title: string; source: string; url: string; publishedAt?: string };
type Recall = { title: string; reason: string; classification?: string; state?: string; date?: string; url: string };
type MarketSignal = { label: string; direction: string };
type SmartBuy = { id: string; name: string; category: string; badge: string; bestFor: string; price: string; evidenceStrength: string; affiliateStatus: "unknown" | "available" | "unavailable"; affiliateProgram: string | null; href: string };
type PulseResponse = { generatedAt: string; trends: Story[]; operatorWatch: Story[]; recalls: Recall[]; markets: { headline: string; summary: string; signals: MarketSignal[]; sourceUrl: string }; smartBuys: SmartBuy[]; degraded?: boolean };

const editorialImages = ["/images/editorial/commercial-kitchen-prep.jpg", "/images/editorial/restaurant-kitchen-service.jpg"];
const goals = [
  { label: "Diabetes-friendly", title: "Fiber · protein · context", href: "/specialized-diets" },
  { label: "Lower sodium", title: "Flavor before restriction", href: "/specialized-diets" },
  { label: "Mediterranean", title: "Pattern, not fad", href: "/menus" },
  { label: "Higher protein", title: "Quality + cost visible", href: "/recipes" },
] as const;

function dateLabel(value?: string) { if (!value) return "Recent"; const date = new Date(value); if (Number.isNaN(date.getTime())) return "Recent"; return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date); }
function cleanTitle(title: string) { return title.replace(/\s+-\s+[^-]+$/, ""); }
function imageFor(index: number) { return editorialImages[index % editorialImages.length]; }

export function CulinaryPulse() {
  const [pulse, setPulse] = useState<PulseResponse | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { const controller = new AbortController(); fetch("/api/culinary-pulse", { signal: controller.signal }).then(r => { if (!r.ok) throw new Error("Pulse unavailable"); return r.json() as Promise<PulseResponse>; }).then(setPulse).catch(reason => { if (reason instanceof DOMException && reason.name === "AbortError") return; setError(true); }); return () => controller.abort(); }, []);

  const lead = pulse?.trends[0];
  const trendCards = pulse?.trends.slice(0, 6) ?? [];
  const operatorCards = pulse?.operatorWatch.slice(0, 6) ?? [];
  const glance = useMemo(() => [
    ["Recall watch", pulse?.recalls.length ? `${pulse.recalls.length} surfaced` : "Scanning", "FDA"],
    ["Food costs", pulse?.markets.signals[0] ? `${pulse.markets.signals[0].label} ${pulse.markets.signals[0].direction}` : "Loading", "FAO"],
    ["Operator watch", operatorCards.length ? `${operatorCards.length} signals` : "Scanning", "LIVE"],
    ["Smart buys", pulse?.smartBuys.length ? `${pulse.smartBuys.length} reviewed` : "Evidence first", "CG"],
  ], [pulse, operatorCards.length]);

  return <>
    <section className={styles.pulse} aria-labelledby="culinary-pulse-title">
      <div className={styles.inner}>
        <p className={styles.kicker}>Culinary Pulse · live intelligence</p>
        <h2 id="culinary-pulse-title" className={styles.heroTitle}>What’s moving in food right now.</h2>
        <p className={styles.heroDeck}>The live food world, translated into decisions — not another endless news feed.</p>
        <span className={styles.liveStamp}>{pulse ? `Updated ${new Date(pulse.generatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Connecting live sources"}</span>

        <div className={styles.leadGrid}>
          <a className={styles.leadStory} href={lead?.url || "#culinary-pulse-title"} target={lead ? "_blank" : undefined} rel={lead ? "noreferrer" : undefined} style={{ backgroundImage: `linear-gradient(180deg, rgba(14,13,12,.08) 0%, rgba(14,13,12,.12) 48%, rgba(14,13,12,.96) 100%), url(${imageFor(0)})` }}>
            <span className={styles.redTag}>Lead signal</span>
            <div><h3>{lead ? cleanTitle(lead.title) : error ? "Live trend feed temporarily unavailable" : "Scanning today’s food signals…"}</h3><small>{lead ? `${lead.source} · ${dateLabel(lead.publishedAt)}` : "Food · restaurants · culinary"}</small></div>
          </a>
          <aside className={styles.glance}><p className={styles.kicker}>Today at a glance</p>{glance.map(([label, value, source]) => <div className={styles.glanceRow} key={label}><span>{label}</span><strong>{value}</strong><small>{source}</small></div>)}</aside>
        </div>

        <div className={styles.sectionHead}><p className={styles.kicker}>Trending now</p><h3>Swipe the signal, not the whole page.</h3></div>
        <div className={styles.horizontalRail} aria-label="Trending culinary stories">
          {trendCards.length ? trendCards.map((story, index) => <a className={styles.visualCard} href={story.url} target="_blank" rel="noreferrer" key={`${story.url}-${story.title}`}><div className={styles.cardImage} style={{ backgroundImage: `linear-gradient(rgba(14,13,12,.08),rgba(14,13,12,.22)),url(${imageFor(index)})` }} /><div className={styles.cardBody}><span>{index === 0 ? "Trust + authenticity" : index === 1 ? "Technique + hospitality" : "Demand signal"}</span><h4>{cleanTitle(story.title)}</h4><small>{story.source} · {dateLabel(story.publishedAt)}</small></div></a>) : <p className={styles.loading}>Scanning current culinary coverage…</p>}
        </div>

        <div className={styles.intelGrid}>
          <section className={styles.recallPanel}><p className={styles.redKicker}>Food safety watch</p><h3>Recalls should read like action cards.</h3>{pulse?.recalls.slice(0, 4).map((recall, i) => <a href={recall.url} target="_blank" rel="noreferrer" className={styles.recallRow} key={`${recall.url}-${i}`}><b>{recall.classification || "Watch"}</b><strong>{recall.title}</strong><span>{recall.reason}</span></a>)}{!pulse?.recalls.length && <p className={styles.lightLoading}>Checking FDA enforcement reports…</p>}</section>
          <section className={styles.marketPanel}><p className={styles.kicker}>Global food-cost radar</p><h3>{pulse?.markets.headline || "Loading FAO index…"}</h3><small>{pulse?.markets.summary || "Official international food-price signal"}</small><div className={styles.marketTable}>{pulse?.markets.signals.slice(0, 6).map(signal => <div key={signal.label}><strong>{signal.label}</strong><span>{signal.direction}</span></div>)}</div>{pulse?.markets.sourceUrl && <a className={styles.sourceLink} href={pulse.markets.sourceUrl} target="_blank" rel="noreferrer">View FAO source →</a>}</section>
        </div>

        <div className={styles.sectionHead}><p className={styles.kicker}>Operator watch</p><h3>What changes how kitchens actually run.</h3></div>
        <div className={styles.horizontalRail}>{operatorCards.length ? operatorCards.map((story,index) => <a className={`${styles.operatorCard} ${index === 1 ? styles.operatorLight : ""}`} href={story.url} target="_blank" rel="noreferrer" key={`${story.url}-${story.title}`}><div className={styles.operatorImage} style={{ backgroundImage: `url(${imageFor(index + 1)})` }} /><div><span>{index === 0 ? "Labor" : index === 1 ? "Technology" : "Operations"}</span><h4>{cleanTitle(story.title)}</h4><small>Why it matters →</small></div></a>) : <p className={styles.loading}>Scanning restaurant operations…</p>}</div>

        <div className={styles.sectionHead}><p className={styles.kicker}>Food strategies</p><h3>Health goals should still look like food.</h3></div>
        <div className={styles.goalRail}>{goals.map((goal,index) => <Link className={styles.goalCard} href={goal.href} key={goal.label}><div style={{ backgroundImage: `linear-gradient(rgba(166,54,40,.15),rgba(166,54,40,.15)),url(${imageFor(index)})` }} /><section><span>{goal.label}</span><h4>{goal.title}</h4><small>Explore →</small></section></Link>)}</div>
      </div>
    </section>

    <section className={styles.buySection} aria-labelledby="smart-buys-title"><div className={styles.inner}><div className={styles.buyHead}><div><p className={styles.kicker}>Today’s Smart Buys</p><h2 id="smart-buys-title">Useful first. Commercial second.</h2></div><p>Publication-reviewed marketplace picks ranked by evidence quality, workflow fit, and value — never commission size.</p></div><div className={styles.buyRail}>{pulse?.smartBuys?.length ? pulse.smartBuys.map(buy => <Link className={styles.buyCard} href={buy.href} key={buy.id}><span>{buy.badge} · {buy.evidenceStrength} evidence</span><h3>{buy.name}</h3><p>{buy.bestFor}</p><strong>{buy.price}</strong><small>See evidence + tradeoffs →</small></Link>) : <p className={styles.loading}>Loading publication-reviewed picks…</p>}</div><Link className={styles.marketplaceLink} href="/marketplace">Explore the full marketplace →</Link></div></section>
  </>;
}
