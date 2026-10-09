import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PRIMARY_NAV } from "../app/lib/public-ia.ts";

const shell = await readFile(new URL("../app/components/PublicShell.tsx", import.meta.url), "utf8");
const nav = await readFile(new URL("../app/components/PublicNav.tsx", import.meta.url), "utf8");
const homepage = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const publicationFrame = await readFile(new URL("../app/components/editorial/PublicationFrame.tsx", import.meta.url), "utf8");
const intake = await readFile(new URL("../app/components/HomepageIntake.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/styles/design-system.css", import.meta.url), "utf8");
const ia = await readFile(new URL("../app/lib/public-ia.ts", import.meta.url), "utf8");

test("publication routes own the primary editorial navigation", () => {
  for (const label of ["Front of House", "Back of House", "Independent & Mobile", "Health & Better Living", "Food Intelligence"]) {
    assert.ok(publicationFrame.includes(label), label);
  }
  assert.match(publicationFrame, /The Marketplace/);
  assert.match(shell, /isPublicationPath/);
  assert.doesNotMatch(homepage, /HomepageIntake|operator-question/);
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
  assert.doesNotMatch(shell, /cg-header-cta/);
  assert.match(css, /\.cg-skip-link:focus/);
});
