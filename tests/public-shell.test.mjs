import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const shell = await readFile(new URL("../app/components/PublicShell.tsx", import.meta.url), "utf8");
const homepage = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const intake = await readFile(new URL("../app/components/HomepageIntake.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/styles/public-design.css", import.meta.url), "utf8");

test("public primary navigation is concise and has one dominant intake action", () => {
  const primaryBlock = shell.match(/const primaryNavigation = \[([\s\S]*?)\] as const;/)?.[1] ?? "";
  assert.match(primaryBlock, /Marketplace/);
  assert.match(primaryBlock, /Grow/);
  assert.match(primaryBlock, /Learn/);
  assert.doesNotMatch(primaryBlock, /Founder|Vision|Early Access|Platform|Ask/);
  assert.match(shell, /href="\/#operator-question"[\s\S]*Tell Chef Gringo/);
  assert.match(intake, /id="operator-question"/);
});

test("mobile navigation has accessible state and no misleading partner destination", () => {
  assert.match(shell, /aria-expanded=\{menuOpen\}/);
  assert.match(shell, /aria-controls="cg-mobile-menu"/);
  assert.match(shell, /aria-label="Mobile navigation"/);
  assert.match(shell, /event\.key !== "Escape"/);
  assert.match(shell, /Founder/);
  assert.match(shell, /Newsletter/);
  assert.doesNotMatch(shell, /Partner with Chef Gringo/);
});

test("footer organizes real routes by intent and includes legal coverage", () => {
  const footerBlock = shell.match(/const footerGroups = \[([\s\S]*?)\] as const;/)?.[1] ?? "";
  for (const label of ["Ask / use", "Learn", "Company", "Legal", "Contact"])
    assert.match(shell, new RegExp(label.replace("/", "\\/"), "i"));
  for (const href of ["/privacy", "/terms", "/medical-and-nutrition-disclaimer", "/newsletter"])
    assert.match(shell, new RegExp(`href: "${href}"|href="${href}"`));
  assert.doesNotMatch(footerBlock, /\/admin|Intelligence Lab|Partner Hunt/);
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
  assert.match(css, /\.cg-skip-link:focus/);
});
