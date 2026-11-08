"use client";

import { useEffect, useState } from "react";
import styles from "./downloads.module.css";

type BuyState =
  | { kind: "checking" }
  | { kind: "ready" }
  | { kind: "unavailable"; message: string }
  | { kind: "working" }
  | { kind: "error"; message: string };

/**
 * Buy button for a downloads product. Checkout state is asked of the
 * server at runtime (GET /api/downloads/checkout) rather than baked into
 * the page: when Stripe is not connected yet, the button disables itself
 * with an honest note instead of leading to a dead end, and the POST
 * fails closed the same way if anything changes in between.
 */
export function BuyButton({ productId, priceLabel }: { productId: string; priceLabel: string }) {
  const [state, setState] = useState<BuyState>({ kind: "checking" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/downloads/checkout")
      .then((response) => response.json())
      .then((data: { checkoutConfigured?: boolean }) => {
        if (cancelled) return;
        setState(
          data.checkoutConfigured
            ? { kind: "ready" }
            : { kind: "unavailable", message: "Checkout is being connected — join Field Notes below to hear when it opens." },
        );
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "ready" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function startCheckout() {
    setState({ kind: "working" });
    try {
      const response = await fetch("/api/downloads/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = (await response.json()) as { url?: string; message?: string };
      if (response.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      setState({
        kind: "error",
        message: data.message || "Checkout could not be started. Please try again in a moment.",
      });
    } catch {
      setState({ kind: "error", message: "Checkout could not be started. Please try again in a moment." });
    }
  }

  if (state.kind === "unavailable") {
    return (
      <div>
        <button type="button" className="cg-button cg-button-secondary" disabled>
          Buy — {priceLabel}
        </button>
        <p className={styles.buyNote}>{state.message}</p>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        className="cg-button cg-button-primary"
        disabled={state.kind === "checking" || state.kind === "working"}
        onClick={startCheckout}
      >
        {state.kind === "working" ? "Opening secure checkout…" : `Buy — ${priceLabel}`}
      </button>
      {state.kind === "error" ? <p className={styles.buyNote}>{state.message}</p> : null}
    </div>
  );
}
