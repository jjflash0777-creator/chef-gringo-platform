"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "./CulinaryPulse.module.css";

type Story = {
  title: string;
  source: string;
  url: string;
  publishedAt?: string;
};

type Recall = {
  title: string;
  reason: string;
  classification?: string;
  state?: string;
  date?: string;
  url: string;
};

type MarketSignal = {
  label: string;
  direction: string;
};

type SmartBuy = {
  id: string;
  name: string;
  category: string;
  badge: string;
  bestFor: string;
  price: string;
  evidenceStrength: string;
  affiliateStatus: "unknown" | "available" | "unavailable";
  affiliateProgram: string | null;
  href: string;
};

type PulseResponse = {
  generatedAt: string;
  trends: Story[];
  operatorWatch: Story[];
  recalls: Recall[];
  markets: {
    headline: string;
    summary: string;
    signals: MarketSignal[];
    sourceUrl: string;
  };
  smartBuys: SmartBuy[];
  degraded?: boolean;
};

const goals = [
  {
    label: "Evidence-led nutrition",
    title: "Diabetes-friendly eating",
    copy: "Build meals around fiber, protein, minimally processed carbohydrates, portion context, and your real preferences — without pretending food replaces medical care.",
    href: "/specialized-diets",
  },
  {
    label: "Food strategy",
    title: "Lower-sodium cooking",
    copy: "See where sodium is actually coming from, preserve flavor with technique, and adapt menus without turning dinner into bland compliance food.",
    href: "/specialized-diets",
  },
  {
    label: "Pattern, not fad",
    title: "Mediterranean-style meals",
    copy: "Turn a broad evidence-backed eating pattern into real menus, recipes, portions, substitutions, and shopping decisions.",
    href: "/menus",
  },
  {
    label: "Performance",
    title: "Higher-protein meals",
    copy: "Increase protein intelligently while keeping calories, fiber, cost, and meal quality visible instead of chasing a single macro number.",
    href: "/recipes",
  },
  {
    label: "Practical adaptation",
    title: "Gluten-aware cooking",
    copy: "Separate preference from medical necessity, identify cross-contact risk, and adapt dishes without automatically degrading the food.",
    href: "/specialized-diets",
  },
  {
    label: "Plant-forward",
    title: "More plants, better food",
    copy: "Use vegetables, beans, grains, herbs, mushrooms, and technique to make plant-forward eating feel culinary rather than restrictive.",
    href: "/recipes",
  },
] as const;

function dateLabel(value?: string) {
  if (!value) return "Recent";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recent";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function cleanTitle(title: string) {
  return title.replace(/\s+-\s+[^-]+$/, "");
}

function commercialLabel(buy: SmartBuy) {
  if (buy.affiliateStatus === "available") return "Affiliate relationship active";
  if (buy.affiliateStatus === "unknown") return "Commercial status not verified";
  return "No affiliate relationship";
}

export function CulinaryPulse() {
  const [pulse, setPulse] = useState<PulseResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/culinary-pulse", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Pulse unavailable");
        return response.json() as Promise<PulseResponse>;
      })
      .then((data) => setPulse(data))
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(true);
      });
    return () => controller.abort();
  }, []);

  const topSignals = useMemo(() => {
    const trend = pulse?.trends[0];
    const recallCount = pulse?.recalls.length ?? 0;
    const market = pulse?.markets.signals[0];
    const operator = pulse?.operatorWatch[0];
    return [
      {
        label: "Trending",
        value: trend ? cleanTitle(trend.title) : "Scanning culinary news",
        detail: trend?.source ?? "Daily signal feed",
      },
      {
        label: "Recall watch",
        value: recallCount ? `${recallCount} current recall records surfaced` : "Checking FDA enforcement reports",
        detail: "FDA enforcement data",
      },
      {
        label: "Global food costs",
        value: market ? `${market.label} ${market.direction}` : "Loading latest FAO signal",
        detail: "Latest official monthly index",
      },
      {
        label: "Operator watch",
        value: operator ? cleanTitle(operator.title) : "Scanning restaurant operations",
        detail: operator?.source ?? "Restaurant + foodservice news",
      },
    ];
  }, [pulse]);

  return (
    <>
      <section className={styles.pulse} aria-labelledby="culinary-pulse-title">
        <div className={styles.inner}>
          <div className={styles.header}>
            <div>
              <p className={styles.kicker}>Culinary Pulse · live intelligence</p>
              <h2 id="culinary-pulse-title">What’s moving in food right now.</h2>
            </div>
            <div className={styles.headerCopy}>
              <p>Chef Gringo watches the food world for signals that change what you cook, buy, price, serve, or avoid — then turns the signal into a useful next move.</p>
              <span className={styles.liveStamp}>{pulse ? `Updated ${new Date(pulse.generatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Connecting live sources"}</span>
            </div>
          </div>

          <div className={styles.signalRail} aria-label="Current culinary signals">
            {topSignals.map((signal) => (
              <article className={styles.signal} key={signal.label}>
                <span>{signal.label}</span>
                <strong>{signal.value}</strong>
                <small>{signal.detail}</small>
              </article>
            ))}
          </div>

          <div className={styles.grid}>
            <section className={styles.panel} aria-labelledby="trend-feed-title">
              <div className={styles.panelHead}>
                <h3 id="trend-feed-title">What people are talking about</h3>
                <span>Food · restaurants · culinary</span>
              </div>
              {pulse?.trends?.length ? (
                <ol className={styles.storyList}>
                  {pulse.trends.slice(0, 5).map((story) => (
                    <li className={styles.story} key={`${story.url}-${story.title}`}>
                      <a href={story.url} target="_blank" rel="noreferrer">
                        <div className={styles.storyMeta}><span>{story.source}</span><time>{dateLabel(story.publishedAt)}</time></div>
                        <h4>{cleanTitle(story.title)}</h4>
                        <p>Chef Gringo surfaces the signal first; recipes, sourcing, pricing, and product connections can layer on top as the evidence is established.</p>
                      </a>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={styles.error}>{error ? "The live news feed is temporarily unavailable. The rest of Chef Gringo still works normally." : "Scanning current food and culinary coverage…"}</p>
              )}
            </section>

            <section className={`${styles.panel} ${styles.panelLight}`} aria-labelledby="recall-feed-title">
              <div className={styles.panelHead}>
                <h3 id="recall-feed-title">Food safety watch</h3>
                <span>FDA enforcement reports</span>
              </div>
              {pulse?.recalls?.length ? (
                <ol className={styles.recallList}>
                  {pulse.recalls.slice(0, 4).map((recall) => (
                    <li className={styles.recall} key={`${recall.url}-${recall.title}`}>
                      <a href={recall.url} target="_blank" rel="noreferrer">
                        <div className={styles.recallMeta}>
                          <span>{recall.classification || "Recall"}</span>
                          {recall.state && <span>{recall.state}</span>}
                          <time>{dateLabel(recall.date)}</time>
                        </div>
                        <h4>{recall.title}</h4>
                        <p>{recall.reason}</p>
                      </a>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={styles.error}>{error ? "FDA recall data could not be loaded right now." : "Checking current FDA food enforcement records…"}</p>
              )}
            </section>

            <section className={styles.panel} aria-labelledby="market-radar-title">
              <div className={styles.panelHead}>
                <h3 id="market-radar-title">Food-cost radar</h3>
                <span>Global commodity pressure</span>
              </div>
              <div className={styles.marketHero}>
                <strong>{pulse?.markets.headline ?? "Loading the latest FAO Food Price Index…"}</strong>
                <span>{pulse?.markets.summary ?? "International commodity prices are translated into practical operator and household implications."}</span>
              </div>
              <div className={styles.marketSignals}>
                {(pulse?.markets.signals ?? []).slice(0, 6).map((signal) => (
                  <div className={styles.marketSignal} key={signal.label}>
                    <strong>{signal.label}</strong>
                    <span>{signal.direction}</span>
                  </div>
                ))}
              </div>
              {pulse?.markets.sourceUrl && <p className={styles.status}><a href={pulse.markets.sourceUrl} target="_blank" rel="noreferrer">View FAO source →</a></p>}
            </section>

            <section className={styles.panel} aria-labelledby="operator-watch-title">
              <div className={styles.panelHead}>
                <h3 id="operator-watch-title">Operator watch</h3>
                <span>Restaurants · labor · tech · equipment</span>
              </div>
              {pulse?.operatorWatch?.length ? (
                <ol className={styles.storyList}>
                  {pulse.operatorWatch.slice(0, 4).map((story) => (
                    <li className={styles.story} key={`${story.url}-${story.title}`}>
                      <a href={story.url} target="_blank" rel="noreferrer">
                        <div className={styles.storyMeta}><span>{story.source}</span><time>{dateLabel(story.publishedAt)}</time></div>
                        <h4>{cleanTitle(story.title)}</h4>
                      </a>
                    </li>
                  ))}
                </ol>
              ) : <p className={styles.error}>Scanning restaurant operations and foodservice developments…</p>}
            </section>
          </div>

          <div className={styles.actionBand}>
            <p className={styles.kicker}>Signal → decision → action</p>
            <h3>Don’t just read the food news. Ask what it changes for you.</h3>
            <p>Turn a recall into a substitution plan. Turn a commodity move into a menu-cost question. Turn a trend into a recipe, product comparison, or restaurant idea.</p>
            <div className={styles.actionLinks}>
              <a href="#operator-question">Ask Chef Gringo</a>
              <Link href="/marketplace">Shop smarter</Link>
              <Link href="/menus">Build a menu</Link>
              <Link href="/services/repair-or-replace">Solve an equipment problem</Link>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.dietSection} aria-labelledby="food-goals-title">
        <div className={styles.inner}>
          <div className={styles.dietHeader}>
            <div>
              <p className={styles.kicker}>Food strategies for real goals</p>
              <h2 id="food-goals-title">Make the goal culinary.</h2>
            </div>
            <p>Choose an eating goal and let Chef Gringo translate it into dishes, menus, substitutions, shopping decisions, and evidence-aware guidance. These are food strategies, not replacements for medical care.</p>
          </div>
          <div className={styles.goalGrid}>
            {goals.map((goal) => (
              <article className={styles.goal} key={goal.title}>
                <span>{goal.label}</span>
                <h3>{goal.title}</h3>
                <p>{goal.copy}</p>
                <Link href={goal.href}>Explore the food strategy →</Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.buySection} aria-labelledby="smart-buys-title">
        <div className={styles.inner}>
          <div className={styles.buyHeader}>
            <div>
              <p className={styles.kicker}>Today’s Smart Buys</p>
              <h2 id="smart-buys-title">Useful first. Commercial second.</h2>
            </div>
            <p>These come from Chef Gringo’s publication-reviewed marketplace records. Ranking uses evidence quality, workflow fit, and value — never commission size.</p>
          </div>
          {pulse?.smartBuys?.length ? (
            <div className={styles.buyGrid}>
              {pulse.smartBuys.map((buy) => (
                <article className={styles.buyCard} key={buy.id}>
                  <div className={styles.buyMeta}><span>{buy.badge}</span><small>{buy.evidenceStrength} evidence</small></div>
                  <h3>{buy.name}</h3>
                  <p className={styles.buyCategory}>{buy.category}</p>
                  <p>{buy.bestFor}</p>
                  <strong>{buy.price}</strong>
                  <small className={styles.commercialState}>{commercialLabel(buy)}</small>
                  <Link href={buy.href}>See the evidence and tradeoffs →</Link>
                </article>
              ))}
            </div>
          ) : <p className={styles.error}>Loading publication-reviewed marketplace picks…</p>}
          <div className={styles.buyFooter}>
            <Link href="/marketplace">Explore the full marketplace</Link>
            <span>Affiliate relationships are disclosed on the destination page when active.</span>
          </div>
        </div>
      </section>
    </>
  );
}
