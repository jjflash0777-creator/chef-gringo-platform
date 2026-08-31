"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "./CulinaryPulse.module.css";

type Story = { title: string; source: string; url: string; publishedAt?: string };
type Recall = { title: string; reason: string; classification?: string; state?: string; date?: string; url: string };
type MarketSignal = { label: string; direction: string };
type SmartBuy = { id: string; name: string; category: string; badge: string; bestFor: string; price: string; evidenceStrength: string; affiliateStatus: "unknown" | "available" | "unavailable"; affiliateProgram: string | null; href: string };
type PulseResponse = { generatedAt: string; trends: Story[]; operatorWatch: Story[]; recalls: Recall[]; markets: { headline: string; summary: string; signals: MarketSignal[]; sourceUrl: string }; smartBuys: SmartBuy[]; degraded?: boolean };
type Persona = "Home cook" | "Restaurant" | "Food truck" | "Senior living" | "Off-grid / homestead";

const editorialImages = ["/images/editorial/commercial-kitchen-prep.jpg", "/images/editorial/restaurant-kitchen-service.jpg"];
const personas: Persona[] = ["Home cook", "Restaurant", "Food truck", "Senior living", "Off-grid / homestead"];
const goals = [
  { label: "Diabetes-friendly", title: "Fiber · protein · context", detail: "Build meals around established dietary patterns, then customize the food.", action: "Build a dinner", href: "/specialized-diets" },
  { label: "Lower sodium", title: "Flavor before restriction", detail: "Transform a menu while protecting flavor, texture, and practical execution.", action: "Transform my menu", href: "/specialized-diets" },
  { label: "Mediterranean", title: "Pattern, not fad", detail: "Turn a dietary pattern into a complete meal and consolidated shopping plan.", action: "Build the menu", href: "/menus" },
  { label: "Higher protein", title: "Quality + cost visible", detail: "Compare protein choices by culinary use, cost, and meal fit.", action: "Explore meals", href: "/recipes" },
] as const;

const personaPrompts: Record<Persona, string[]> = {
  "Home cook": ["What should I cook with what I have?", "Check a recall against my kitchen", "Build a smarter shopping list"],
  Restaurant: ["Recost my menu", "Compare restaurant technology", "Find a safer or cheaper substitute"],
  "Food truck": ["Size my power system", "Compare POS and labor tools", "Calculate equipment runtime"],
  "Senior living": ["Transform a menu for dietary needs", "Check recalls and substitutions", "Analyze food-cost pressure"],
  "Off-grid / homestead": ["Plan backup kitchen power", "Compare growing systems", "Connect what I grow to what I cook"],
};

function dateLabel(value?: string) { if (!value) return "Recent"; const date = new Date(value); if (Number.isNaN(date.getTime())) return "Recent"; return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date); }
function cleanTitle(title: string) { return title.replace(/\s+-\s+[^-]+$/, ""); }
function imageFor(index: number) { return editorialImages[index % editorialImages.length]; }
function actionHref(prompt: string) { return `/#operator-question`; }
function storyActions(index: number) { return index === 0 ? ["What does this mean for me?", "Show the evidence", "What should I do?"] : index === 1 ? ["Explain the impact", "Compare options", "Take action"] : ["Why it matters", "Connect it to my kitchen", "Ask Chef Gringo"]; }

export function CulinaryPulse() {
  const [pulse, setPulse] = useState<PulseResponse | null>(null);
  const [error, setError] = useState(false);
  const [persona, setPersona] = useState<Persona>("Home cook");
  useEffect(() => { const controller = new AbortController(); fetch("/api/culinary-pulse", { signal: controller.signal }).then(r => { if (!r.ok) throw new Error("Pulse unavailable"); return r.json() as Promise<PulseResponse>; }).then(setPulse).catch(reason => { if (reason instanceof DOMException && reason.name === "AbortError") return; setError(true); }); return () => controller.abort(); }, []);

  const lead = pulse?.trends[0];
  const trendCards = pulse?.trends.slice(0, 6) ?? [];
  const operatorCards = pulse?.operatorWatch.slice(0, 6) ?? [];
  const glance = useMemo(() => [
    ["Recall risk", pulse?.recalls.length ? `${pulse.recalls.length} surfaced` : "Scanning", "FDA"],
    ["Ingredient pressure", pulse?.markets.signals[0] ? `${pulse.markets.signals[0].label} ${pulse.markets.signals[0].direction}` : "Loading", "FAO"],
    ["Restaurant business", operatorCards.length ? `${operatorCards.length} signals` : "Scanning", "LIVE"],
    ["Trending cuisine", trendCards.length ? cleanTitle(trendCards[0].title).slice(0, 28) : "Scanning", "LIVE"],
    ["Best opportunity", persona === "Food truck" ? "Power + operations" : persona === "Restaurant" ? "Margin + labor" : persona === "Senior living" ? "Diet + procurement" : persona === "Off-grid / homestead" ? "Power + growing" : "Cook + save", "FOR YOU"],
  ], [pulse, operatorCards.length, trendCards, persona]);

  return <>
    <section className={styles.pulse} aria-labelledby="culinary-pulse-title">
      <div className={styles.inner}>
        <div className={styles.pulseIntro}>
          <div><p className={styles.kicker}>Culinary Pulse · live intelligence</p><h2 id="culinary-pulse-title" className={styles.heroTitle}>What changed — and what should you do?</h2><p className={styles.heroDeck}>Chef Gringo watches food, safety, costs, kitchens, and culture, then connects each signal to a decision.</p></div>
          <div className={styles.askPanel}><span>Ask anything</span><strong>The feed is only useful if it changes a decision.</strong><Link href="#operator-question">Ask Chef Gringo →</Link></div>
        </div>
        <span className={styles.liveStamp}>{pulse ? `Updated ${new Date(pulse.generatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Connecting live sources"}</span>

        <div className={styles.personaBar}><div><span>Make this useful to me</span><strong>I’m here as:</strong></div><div className={styles.personaChoices}>{personas.map(item => <button type="button" key={item} onClick={() => setPersona(item)} className={persona === item ? styles.personaActive : ""}>{item}</button>)}</div></div>
        <div className={styles.quickActions}>{personaPrompts[persona].map(prompt => <Link key={prompt} href={actionHref(prompt)}>{prompt}<span>→</span></Link>)}</div>

        <div className={styles.leadGrid}>
          <article className={styles.leadStory} style={{ backgroundImage: `linear-gradient(180deg, rgba(14,13,12,.04) 0%, rgba(14,13,12,.18) 48%, rgba(14,13,12,.96) 100%), url(${imageFor(0)})` }}>
            <span className={styles.redTag}>Lead signal · importance first</span>
            <div><h3>{lead ? cleanTitle(lead.title) : error ? "Live trend feed temporarily unavailable" : "Scanning today’s food signals…"}</h3><small>{lead ? `${lead.source} · ${dateLabel(lead.publishedAt)}` : "Food · restaurants · culinary"}</small><div className={styles.actionRow}>{storyActions(0).map(action => <Link href="#operator-question" key={action}>{action}</Link>)}</div></div>
          </article>
          <aside className={styles.glance}><p className={styles.kicker}>Today at a glance</p><h3>Five signals worth your attention</h3>{glance.map(([label, value, source]) => <div className={styles.glanceRow} key={label}><span>{label}</span><strong>{value}</strong><small>{source}</small></div>)}</aside>
        </div>

        <div className={styles.sectionHead}><div><p className={styles.kicker}>Today</p><h3>Swipe the signal, not the whole page.</h3></div><p>Move sideways for depth; move down only when you want a different kind of intelligence.</p></div>
        <div className={styles.horizontalRail} aria-label="Trending culinary stories">
          {trendCards.length ? trendCards.map((story, index) => <article className={styles.visualCard} key={`${story.url}-${story.title}`}><a className={styles.storyLink} href={story.url} target="_blank" rel="noreferrer"><div className={styles.cardImage} style={{ backgroundImage: `linear-gradient(rgba(14,13,12,.05),rgba(14,13,12,.18)),url(${imageFor(index)})` }} /><div className={styles.cardBody}><span>{index === 0 ? "Trust + authenticity" : index === 1 ? "Technique + hospitality" : "Demand signal"}</span><h4>{cleanTitle(story.title)}</h4><small>{story.source} · {dateLabel(story.publishedAt)}</small></div></a><div className={styles.cardActions}>{storyActions(index).slice(0,2).map(action => <Link href="#operator-question" key={action}>{action}</Link>)}</div></article>) : <p className={styles.loading}>Scanning current culinary coverage…</p>}
        </div>

        <div className={styles.intelGrid}>
          <section className={styles.recallPanel}><p className={styles.redKicker}>For your kitchen · food safety</p><h3>What requires action?</h3><div className={styles.recallHeader}><span>Risk</span><span>Product</span><span>Reason</span><span>Region</span><span>Action</span></div>{pulse?.recalls.slice(0, 5).map((recall, i) => <div className={styles.recallRow} key={`${recall.url}-${i}`}><b>{recall.classification || "Watch"}</b><strong>{recall.title}</strong><span>{recall.reason}</span><span>{recall.state || "See notice"}</span><a href={recall.url} target="_blank" rel="noreferrer">Check →</a></div>)}{!pulse?.recalls.length && <p className={styles.lightLoading}>Checking FDA enforcement reports…</p>}<Link className={styles.panelAction} href="#operator-question">Check this against my kitchen →</Link></section>
          <section className={styles.marketPanel}><p className={styles.kicker}>For your money · food-cost radar</p><h3>{pulse?.markets.headline || "Loading FAO index…"}</h3><small>{pulse?.markets.summary || "Official international food-price signal"}</small><div className={styles.marketTable}>{pulse?.markets.signals.slice(0, 6).map(signal => <div key={signal.label}><strong>{signal.label}</strong><span>{signal.direction}</span><small>Translate to menu + purchasing</small></div>)}</div><div className={styles.marketActions}><Link href="#operator-question">Recost my menu</Link><Link href="#operator-question">Find substitutions</Link>{pulse?.markets.sourceUrl && <a href={pulse.markets.sourceUrl} target="_blank" rel="noreferrer">FAO evidence</a>}</div></section>
        </div>

        <div className={styles.sectionHead}><div><p className={styles.kicker}>For your business</p><h3>What changes how kitchens actually run.</h3></div><p>Hospitality only: labor, restaurant technology, equipment, margins, sourcing, and operating behavior.</p></div>
        <div className={styles.horizontalRail}>{operatorCards.length ? operatorCards.map((story,index) => <article className={`${styles.operatorCard} ${index === 1 ? styles.operatorLight : ""}`} key={`${story.url}-${story.title}`}><div className={styles.operatorImage} style={{ backgroundImage: `url(${imageFor(index + 1)})` }} /><div><span>{index === 0 ? "Labor" : index === 1 ? "Technology" : "Operations"}</span><h4>{cleanTitle(story.title)}</h4><a href={story.url} target="_blank" rel="noreferrer">Read source ↗</a><Link href="#operator-question">What does this change for me? →</Link></div></article>) : <p className={styles.loading}>Scanning restaurant operations…</p>}</div>

        <div className={styles.sectionHead}><div><p className={styles.kicker}>For your health</p><h3>Health goals should still look like food.</h3></div><p>Evidence-led starting points that turn into menus, recipes, shopping decisions, and practical kitchen action.</p></div>
        <div className={styles.goalRail}>{goals.map((goal,index) => <Link className={styles.goalCard} href={goal.href} key={goal.label}><div style={{ backgroundImage: `linear-gradient(rgba(14,13,12,.05),rgba(14,13,12,.2)),url(${imageFor(index)})` }} /><section><span>{goal.label}</span><h4>{goal.title}</h4><p>{goal.detail}</p><small>{goal.action} →</small></section></Link>)}</div>
      </div>
    </section>

    <section className={styles.buySection} aria-labelledby="smart-buys-title"><div className={styles.inner}><div className={styles.buyHead}><div><p className={styles.kicker}>Solutions worth considering</p><h2 id="smart-buys-title">Why did this surface today?</h2></div><p>Commercial relationships never get to decide the recommendation. Each solution needs a reason, evidence, fit, and tradeoffs before the link earns space here.</p></div><div className={styles.buyRail}>{pulse?.smartBuys?.length ? pulse.smartBuys.map(buy => <Link className={styles.buyCard} href={buy.href} key={buy.id}><span>{buy.badge} · {buy.evidenceStrength} evidence</span><h3>{buy.name}</h3><p><b>Best for:</b> {buy.bestFor}</p><p><b>Why it surfaced:</b> It connects to a problem Chef Gringo is already helping operators solve.</p><strong>{buy.price}</strong><small>See evidence, fit + tradeoffs →</small></Link>) : <p className={styles.loading}>Loading publication-reviewed solutions…</p>}</div><div className={styles.solveFooter}><div><span>Nothing here match your problem?</span><h3>Start with the decision, not the product.</h3></div><Link href="#operator-question">Tell Chef Gringo what you’re working on →</Link></div></div></section>
  </>;
}
