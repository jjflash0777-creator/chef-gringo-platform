"use client";

import Link from "next/link";
import type { PointerEvent, ReactNode } from "react";
import styles from "./InteractiveDepth.module.css";

type DepthProps = {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
};

type DepthLinkProps = DepthProps & {
  href: string;
  variant?: "category" | "product";
};

function setDepthVars(target: HTMLElement, event: PointerEvent<HTMLElement>, maxTilt: number) {
  if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (event.pointerType === "touch") return;

  const rect = target.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - 0.5;
  const y = (event.clientY - rect.top) / rect.height - 0.5;

  target.style.setProperty("--depth-rx", `${(-y * maxTilt).toFixed(2)}deg`);
  target.style.setProperty("--depth-ry", `${(x * maxTilt).toFixed(2)}deg`);
  target.style.setProperty("--depth-bg-x", `${(-x * 14).toFixed(2)}px`);
  target.style.setProperty("--depth-bg-y", `${(-y * 10).toFixed(2)}px`);
  target.style.setProperty("--depth-shade-x", `${(-x * 5).toFixed(2)}px`);
  target.style.setProperty("--depth-shade-y", `${(-y * 4).toFixed(2)}px`);
  target.style.setProperty("--depth-fg-x", `${(x * 7).toFixed(2)}px`);
  target.style.setProperty("--depth-fg-y", `${(y * 5).toFixed(2)}px`);
  target.style.setProperty("--depth-light-x", `${(50 + x * 25).toFixed(2)}%`);
  target.style.setProperty("--depth-light-y", `${(45 + y * 18).toFixed(2)}%`);
}

function resetDepthVars(target: HTMLElement) {
  target.style.setProperty("--depth-rx", "0deg");
  target.style.setProperty("--depth-ry", "0deg");
  target.style.setProperty("--depth-bg-x", "0px");
  target.style.setProperty("--depth-bg-y", "0px");
  target.style.setProperty("--depth-shade-x", "0px");
  target.style.setProperty("--depth-shade-y", "0px");
  target.style.setProperty("--depth-fg-x", "0px");
  target.style.setProperty("--depth-fg-y", "0px");
  target.style.setProperty("--depth-light-x", "50%");
  target.style.setProperty("--depth-light-y", "45%");
}

export function HeroDepthSection({ children, className = "", maxTilt = 2.8 }: DepthProps) {
  return (
    <section
      className={`${styles.heroDepth} ${className}`}
      aria-labelledby="approved-home-title"
      onPointerMove={(event) => setDepthVars(event.currentTarget, event, maxTilt)}
      onPointerLeave={(event) => resetDepthVars(event.currentTarget)}
    >
      {children}
    </section>
  );
}

export function DepthAside({ children, className = "", maxTilt = 7 }: DepthProps) {
  return (
    <aside
      className={`${styles.depthSurface} ${styles.quoteDepth} ${className}`}
      onPointerMove={(event) => setDepthVars(event.currentTarget, event, maxTilt)}
      onPointerLeave={(event) => resetDepthVars(event.currentTarget)}
    >
      {children}
    </aside>
  );
}

export function DepthLink({ children, className = "", href, maxTilt = 6, variant = "category" }: DepthLinkProps) {
  const variantClass = variant === "product" ? styles.productDepth : styles.categoryDepth;

  return (
    <Link
      className={`${styles.depthSurface} ${variantClass} ${className}`}
      href={href}
      onPointerMove={(event) => setDepthVars(event.currentTarget, event, maxTilt)}
      onPointerLeave={(event) => resetDepthVars(event.currentTarget)}
    >
      {children}
    </Link>
  );
}
