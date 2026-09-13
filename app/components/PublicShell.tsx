"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FOOTER_GROUPS } from "../lib/public-ia";
import { PublicNav } from "./PublicNav";

function isInternalPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function Brand() {
  return (
    <Link className="cg-shell-brand" href="/" aria-label="Chef Gringo home">
      <Image
        unoptimized
        src="/brand/cg-horizontal-lockup.png"
        alt="Chef Gringo — Hospitality Intelligence"
        width={736}
        height={200}
        priority
      />
    </Link>
  );
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButton.current?.focus();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  return (
    <header className="cg-site-header">
      <div className="cg-width-wide cg-header-row">
        <Brand />
        <PublicNav variant="desktop" />
        <button
          ref={menuButton}
          className="cg-menu-button"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="cg-mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span aria-hidden="true">{menuOpen ? "Close" : "Menu"}</span>
          <span className="cg-visually-hidden">{menuOpen ? "Close navigation menu" : "Open navigation menu"}</span>
        </button>
      </div>
      <nav id="cg-mobile-menu" className="cg-mobile-menu" aria-label="Mobile navigation" hidden={!menuOpen}>
        <div className="cg-width-wide">
          <PublicNav variant="mobile" onNavigate={() => setMenuOpen(false)} />
        </div>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="cg-site-footer">
      <div className="cg-width-wide cg-footer-grid">
        <div className="cg-footer-intro">
          <Brand />
          <p>Practical intelligence for people who cook, operate, lead, and build in hospitality.</p>
          <Link className="cg-footer-tell" href="/#operator-question">Ask Chef Gringo <span aria-hidden="true">→</span></Link>
        </div>
        {FOOTER_GROUPS.map((group) => (
          <nav aria-label={`${group.label} links`} key={group.label}>
            <h2>{group.label}</h2>
            {group.links.map((item) => (
              <Link href={item.href} key={`${item.href}-${item.label}`}>{item.label}</Link>
            ))}
          </nav>
        ))}
        <div className="cg-footer-contact">
          <h2>Contact</h2>
          <Link href="/newsletter">Newsletter</Link>
          <a href="mailto:hello@chefgringo.com">hello@chefgringo.com</a>
        </div>
      </div>
      <div className="cg-width-wide cg-footer-base">© {new Date().getFullYear()} Chef Gringo. Practical value before promotion.</div>
    </footer>
  );
}

export function PublicShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const internal = isInternalPath(pathname);

  if (internal) return <main id="main">{children}</main>;

  return (
    <div className="cg-public-scope">
      <a className="cg-skip-link" href="#main">Skip to content</a>
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </div>
  );
}
