"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FOOTER_GROUPS } from "../lib/public-ia";

function isInternalPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function Brand() {
  return (
    <Link className="cg-commerce-brand" href="/" aria-label="Chef Gringo home">
      <strong>CHEF GRINGO<span aria-hidden="true" style={{ color: "#ef2432" }}>★</span></strong>
      <span>Buy smarter. Cook better. Profit more.</span>
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

  const nav = [
    ["Equipment", "/marketplace?path=equipment"],
    ["Kitchen", "/marketplace"],
    ["Food & Drink", "/learn"],
    ["Outdoor / Mobile", "/business"],
    ["Parts & Service", "/marketplace?view=problems"],
    ["SaaS & POS", "/marketplace?view=problems"],
    ["Brands", "/marketplace"],
    ["Deals", "/marketplace"],
  ] as const;

  return (
    <header className="cg-commerce-header">
      <div className="cg-commerce-top">
        <Brand />
        <div className="cg-commerce-search" role="search">
          <input aria-label="What are you looking for?" placeholder="What are you looking for?  e.g. best commercial ice machine under $3,000" />
          <Link href="/marketplace" aria-label="Search Chef Gringo marketplace">⌕</Link>
        </div>
        <nav className="cg-commerce-quick" aria-label="Quick actions">
          <Link href="/marketplace"><b>◇</b><span>Deals</span></Link>
          <Link href="/marketplace/compare"><b>▥</b><span>Compare</span></Link>
          <Link href="/learn"><b>▱</b><span>Guides</span></Link>
          <Link href="/start?path=fix"><b>⌁</b><span>Solve</span></Link>
        </nav>
        <button ref={menuButton} className="cg-commerce-menu" type="button" aria-expanded={menuOpen} aria-controls="commerce-mobile-menu" onClick={() => setMenuOpen((value) => !value)}>{menuOpen ? "Close" : "Menu"}</button>
      </div>
      <nav className="cg-commerce-nav" aria-label="Shopping navigation">
        <div className="cg-commerce-nav-inner">
          {nav.map(([label, href]) => <Link key={label} href={href}>{label}</Link>)}
        </div>
      </nav>
      <nav id="commerce-mobile-menu" className="cg-commerce-mobile" aria-label="Mobile shopping navigation" hidden={!menuOpen}>
        {nav.map(([label, href]) => <Link key={label} href={href} onClick={() => setMenuOpen(false)}>{label}</Link>)}
        <Link href="/marketplace/compare" onClick={() => setMenuOpen(false)}>Compare</Link>
        <Link href="/start?path=fix" onClick={() => setMenuOpen(false)}>Solve a problem</Link>
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
          <p>Independent hospitality intelligence for buying, fixing, cooking, and operating smarter.</p>
          <Link className="cg-footer-tell" href="/start">Ask Chef Gringo <span aria-hidden="true">→</span></Link>
        </div>
        {FOOTER_GROUPS.map((group) => (
          <nav aria-label={`${group.label} links`} key={group.label}>
            <h2>{group.label}</h2>
            {group.links.map((item) => <Link href={item.href} key={`${item.href}-${item.label}`}>{item.label}</Link>)}
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
