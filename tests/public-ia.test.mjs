import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { FOOTER_GROUPS, HOMEPAGE_GOALS, PRIMARY_NAV, publicHrefs } from "../app/lib/public-ia.ts";

const shell = await readFile(new URL("../app/components/PublicShell.tsx", import.meta.url), "utf8");
const nav = await readFile(new URL("../app/components/PublicNav.tsx", import.meta.url), "utf8");
const home = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const recipes = await readFile(new URL("../app/recipes/page.tsx", import.meta.url), "utf8");
const discover = await readFile(new URL("../app/knowledge/components/KnowledgeSearch.tsx", import.meta.url), "utf8");
const cut = await readFile(new URL("../app/cut-intelligence/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/styles/public-design.css", import.meta.url), "utf8");
const ia = await readFile(new URL("../app/lib/public-ia.ts", import.meta.url), "utf8");

test("primary navigation exposes the five public destinations", () => {
  assert.deepEqual(PRIMARY_NAV.map((entry) => entry.label), [
    "Ask Chef Gringo",
    "Learn",
    "Marketplace",
    "Build a Food Business",
    "Tools",
  ]);
  assert.equal(PRIMARY_NAV[0].href, "/#operator-question");
  assert.equal(PRIMARY_NAV.find((entry) => entry.id === "marketplace")?.href, "/marketplace");
  assert.ok(PRIMARY_NAV.find((entry) => entry.id === "learn")?.items.some((item) => item.href === "/cut-intelligence"));
  assert.ok(PRIMARY_NAV.find((entry) => entry.id === "tools")?.items.some((item) => item.href === "/services/repair-or-replace"));
  assert.ok(PRIMARY_NAV.find((entry) => entry.id === "tools")?.items.some((item) => item.href === "/cut-intelligence" && item.status === "preview"));
});

test("desktop panels open on click or focus and never hover-only", () => {
  assert.match(nav, /onClick=\{onToggle\}/);
  assert.match(nav, /onFocus=\{onOpen\}/);
  assert.match(nav, /onMouseEnter=\{onOpen\}/);
  assert.match(nav, /aria-expanded=\{open\}/);
  assert.match(nav, /aria-controls=\{panelId\}/);
  assert.match(nav, /hidden=\{!open\}/);
  assert.doesNotMatch(css, /\.cg-nav-item:hover \.cg-nav-panel\s*\{[^}]*display:\s*block/);
  assert.match(nav, /event\.key !== "Escape"/);
});

test("mobile expansion is explicit tap with 44px targets", () => {
  assert.match(shell, /aria-label="Mobile navigation"/);
  assert.match(shell, /aria-expanded=\{menuOpen\}/);
  assert.match(shell, /aria-controls="cg-mobile-menu"/);
  assert.match(nav, /cg-mobile-trigger/);
  assert.match(css, /\.cg-nav-trigger \{[\s\S]*?min-height:\s*2\.75rem/);
  assert.match(css, /\.cg-menu-button\s*\{[\s\S]*?min-height:\s*2\.75rem/);
});

test("admin and internal research routes stay out of public navigation", () => {
  const hrefs = publicHrefs().join(" ");
  assert.doesNotMatch(hrefs, /\/admin/);
  assert.doesNotMatch(ia, /Intelligence Lab|Partner Hunt/);
  assert.doesNotMatch(shell, /Intelligence Lab|Partner Hunt/);
});

test("footer and homepage keep Marketplace, recipes honesty, and repair reachability", () => {
  assert.ok(FOOTER_GROUPS.some((group) => group.links.some((link) => link.href === "/marketplace")));
  assert.ok(FOOTER_GROUPS.some((group) => group.links.some((link) => link.href === "/services/repair-or-replace")));
  assert.match(recipes, /Two complete recipes/);
  assert.match(recipes, /Not a library/);
  assert.doesNotMatch(recipes, /dozens of recipes|hundreds of recipes/i);
  assert.match(discover, /No dedicated page yet/);
  assert.doesNotMatch(discover, /discover\?q=/);
});

test("Cut Intelligence preview is honest and linked from home", () => {
  assert.match(cut, /Preview/);
  assert.match(cut, /not built/i);
  assert.match(cut, /Beef is first/);
  assert.doesNotMatch(cut, /photo recognition exists|upload a photo now|interactive cattle/i);
  assert.match(cut, /no livestock illustration/i);
  assert.match(home, /href="\/cut-intelligence"/);
});

test("homepage section order is orientation, not an endless experiment dump", () => {
  const order = [
    "cg-approved-hero",
    "cg-approved-intake",
    "cg-home-goals",
    "cg-home-capabilities",
    "cg-home-learn",
    "cg-home-market",
    "cg-home-business",
    "cg-home-evidence",
  ];
  let cursor = 0;
  for (const name of order) {
    const next = home.indexOf(name, cursor);
    assert.ok(next > cursor, name);
    cursor = next;
  }
  assert.equal((home.match(/<section /g) ?? []).length, 8);
  assert.ok(HOMEPAGE_GOALS.length >= 6);
  assert.match(css, /prefers-reduced-motion: reduce/);
});
