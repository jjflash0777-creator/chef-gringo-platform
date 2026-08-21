"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { isCurrentNavHref, PRIMARY_NAV, type PrimaryNavEntry } from "../lib/public-ia";

function Status({ status }: { status?: "live" | "preview" }) {
  if (status !== "preview") return null;
  return <span className="cg-nav-status">Preview</span>;
}

export function PublicNav({
  variant,
  onNavigate,
}: {
  variant: "desktop" | "mobile";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [openId, setOpenId] = useState<string | null>(null);
  const [navPath, setNavPath] = useState(pathname);
  if (navPath !== pathname) {
    setNavPath(pathname);
    setOpenId(null);
  }
  const root = useRef<HTMLDivElement>(null);
  const baseId = useId();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpenId(null);
    }
    function onPointer(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpenId(null);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, []);

  function toggle(id: string) {
    setOpenId((current) => (current === id ? null : id));
  }

  const label = variant === "desktop" ? "Primary navigation" : undefined;
  const Tag = variant === "desktop" ? "nav" : "div";

  return (
    <Tag className={variant === "desktop" ? "cg-desktop-nav" : "cg-mobile-nav-tree"} aria-label={label}>
      <div ref={root} className="cg-nav-root">
      {PRIMARY_NAV.map((entry) => (
        entry.items.length === 0 ? (
          <Link
            key={entry.id}
            href={entry.href}
            className="cg-nav-direct"
            aria-current={isCurrentNavHref(pathname, entry.href) ? "page" : undefined}
            onClick={onNavigate}
          >
            {entry.label}
          </Link>
        ) : variant === "desktop" ? (
          <DesktopItem
            key={entry.id}
            entry={entry}
            open={openId === entry.id}
            panelId={`${baseId}-${entry.id}`}
            pathname={pathname}
            onOpen={() => setOpenId(entry.id)}
            onToggle={() => toggle(entry.id)}
            onClose={() => setOpenId(null)}
          />
        ) : (
          <MobileItem
            key={entry.id}
            entry={entry}
            open={openId === entry.id}
            panelId={`${baseId}-mobile-${entry.id}`}
            pathname={pathname}
            onToggle={() => toggle(entry.id)}
            onNavigate={onNavigate}
          />
        )
      ))}
      </div>
    </Tag>
  );
}

function DesktopItem({
  entry,
  open,
  panelId,
  pathname,
  onOpen,
  onToggle,
  onClose,
}: {
  entry: PrimaryNavEntry;
  open: boolean;
  panelId: string;
  pathname: string;
  onOpen: () => void;
  onToggle: () => void;
  onClose: () => void;
}) {
  return (
    <div className="cg-nav-item" onMouseEnter={onOpen}>
      <button
        type="button"
        className="cg-nav-trigger"
        data-nav-trigger=""
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-haspopup="true"
        onClick={(event) => {
          // Hover already opened the panel; a following mouse click must not
          // immediately close it. Keyboard and touch still toggle.
          if (event.nativeEvent.detail > 0 && "pointerType" in event.nativeEvent && event.nativeEvent.pointerType === "mouse") {
            onOpen();
            return;
          }
          onToggle();
        }}
        onFocus={onOpen}
      >
        {entry.label}
      </button>
      {open ? (
        <div className="cg-nav-panel" id={panelId} role="region" aria-label={`${entry.label} menu`}>
          <Link className="cg-nav-overview" href={entry.href} aria-current={isCurrentNavHref(pathname, entry.href) ? "page" : undefined}>
            {entry.label} overview
          </Link>
          <ul>
            {entry.items.map((item) => (
              <li key={`${item.href}-${item.label}`}>
                <Link href={item.href} onClick={onClose}>
                  <strong>{item.label} <Status status={item.status} /></strong>
                  <span>{item.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function MobileItem({
  entry,
  open,
  panelId,
  pathname,
  onToggle,
  onNavigate,
}: {
  entry: PrimaryNavEntry;
  open: boolean;
  panelId: string;
  pathname: string;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="cg-mobile-item">
      <button
        type="button"
        className="cg-nav-trigger cg-mobile-trigger"
        data-nav-trigger=""
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={onToggle}
      >
        {entry.label}
      </button>
      {open ? (
        <div id={panelId} className="cg-mobile-panel">
          <Link href={entry.href} onClick={onNavigate} aria-current={isCurrentNavHref(pathname, entry.href) ? "page" : undefined}>
            {entry.label} overview
          </Link>
          {entry.items.map((item) => (
            <Link href={item.href} key={`${item.href}-${item.label}`} onClick={onNavigate}>
              {item.label} <Status status={item.status} />
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
