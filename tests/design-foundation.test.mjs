import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const publicCss = await readFile(new URL("../app/styles/public-design.css", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");

test("public design foundation exposes the restrained semantic token contract", () => {
  for (const token of [
    "--cg-canvas", "--cg-paper", "--cg-graphite", "--cg-forest", "--cg-oxide", "--cg-brass",
    "--cg-paper-gray", "--cg-muted", "--cg-border", "--cg-text", "--cg-text-secondary",
    "--cg-text-inverse", "--cg-focus", "--cg-width-reading", "--cg-width-working", "--cg-width-wide",
  ]) assert.match(publicCss, new RegExp(`${token}:`));
});

test("typography, surfaces, shape, and elevation remain opt-in public primitives", () => {
  for (const primitive of [
    ".cg-public-scope", ".cg-type-display", ".cg-type-body", ".cg-type-operational", ".cg-type-numeric",
    ".cg-wordmark-slot", ".cg-surface-canvas", ".cg-surface-paper", ".cg-surface-graphite",
    ".cg-surface-forest", ".cg-card", ".cg-feature", ".cg-status",
  ]) assert.match(publicCss, new RegExp(primitive.replace(".", "\\.")));
  assert.match(publicCss, /font-variant-numeric:\s*tabular-nums/);
  assert.doesNotMatch(publicCss, /@font-face|https?:\/\/|linear-gradient|radial-gradient|@keyframes/);
});

test("public buttons provide durable variants, touch targets, focus, and reduced motion", () => {
  for (const variant of [".cg-button-primary", ".cg-button-secondary", ".cg-button-quiet"])
    assert.match(publicCss, new RegExp(variant.replace(".", "\\.")));
  assert.match(publicCss, /\.cg-button\s*\{[^}]*min-height:\s*3rem/s);
  assert.match(publicCss, /:focus-visible/);
  assert.match(publicCss, /prefers-reduced-motion:\s*reduce/);
  assert.match(publicCss, /cursor:\s*not-allowed/);
});

test("the public layer is imported without targeting internal interfaces", () => {
  assert.match(layout, /import "\.\/styles\/public-design\.css";/);
  for (const internalSelector of [".admin-", ".intelligence-", ".partner-hunt", ".knowledge-editor"])
    assert.doesNotMatch(publicCss, new RegExp(internalSelector.replace(".", "\\.")));
});
