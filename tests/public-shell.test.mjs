import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PRIMARY_NAV } from "../app/lib/public-ia.ts";

const shell = await readFile(new URL("../app/components/PublicShell.tsx", import.meta.url), "utf8");
const nav = await readFile(new URL("../app/components/PublicNav.tsx", import.meta.url), "utf8");
const homepage = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const intake = await readFile(new URL("../app/components/HomepageIntake.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/styles/public-design.css", import.meta.url), "utf8");
const ia = await readFile(new URL("../app/lib/public-ia.ts", import.meta.url), "utf8");

test("public primary navigation is concise and has one dominant intake action", () => {
  const primaryLabels = PRIMARY_NAV.map((entry) => entry.label).join(" ");
  assert.match(ia, /Ask Chef Gringo/);
  assert.match(ia, /Marketplace/);
  assert.match(ia, /Learn/);
  assert.match(ia, /Build a Food Business/);
  assert.match(ia, /Tools/);
  assert.doesNotMatch(primaryLabels, /Founder|Vision|Early Access|Platform/);
  assert.match(shell, /href="\/#operator-question"[\s\S]*Ask Chef Gringo/);
  assert.match(intake, /id="operator-question"/);
});

test("mobile navigation has accessible state and no misleading partner destination", () => {
  assert.match(shell, /aria-expanded=\{menuOpen\}/);
  assert.match(shell, /aria-controls="cg-mobile-menu"/);
  assert.match(shell, /aria-label="Mobile navigation"/);
  assert.match(shell, /event\.key !== "Escape"/);
  assert.match(nav, /event\.key !== "Escape"/);
  assert.match(shell, /Newsletter/);
  assert.match(ia, /Founder/);
  assert.doesNotMatch(shell, /Partner with Chef Gringo/);
});

test("footer organizes real routes by intent and includes legal coverage", () => {
  for (const label of ["Use", "Learn", "Company", "Legal", "Contact"])
    assert.match(ia + shell, new RegExp(label));
  for (const href of ["/privacy", "/terms", "/medical-and-nutrition-disclaimer", "/newsletter"])
    assert.match(ia, new RegExp(href.replaceAll("/", "\\/")));
  assert.doesNotMatch(ia, /\/admin|Intelligence Lab|Partner Hunt/);
});

test("public shell excludes admin routes and retires the operator dock", () => {
  assert.match(shell, /pathname\.startsWith\("\/admin\/"\)/);
  assert.doesNotMatch(homepage, /OperatorToolDock|operator-dock/);
  assert.doesNotMatch(shell, /#platform|Platform/);
});

test("shell CSS covers compact, safe-area, touch, and focus behavior", () => {
  assert.match(css, /@media \(max-width: 22rem\)/);
  assert.match(css, /@media \(max-width: 46rem\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /\.cg-menu-button\s*\{[\s\S]*?min-height:\s*2\.75rem/);
  assert.match(css, /grid-template-columns:\s*minmax\(0, 1fr\) auto/);
  assert.match(css, /\.cg-header-cta\s*\{\s*display:\s*none/);
  assert.match(css, /\.cg-skip-link:focus/);
});
