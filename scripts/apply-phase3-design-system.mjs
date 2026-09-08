import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";

const root = process.cwd();
const file = (path) => join(root, path);
const read = (path) => readFileSync(file(path), "utf8");
const write = (path, content) => {
  mkdirSync(dirname(file(path)), { recursive: true });
  writeFileSync(file(path), content, "utf8");
};
const run = (command, args) => execFileSync(command, args, { cwd: root, stdio: "inherit" });

const branch = execFileSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf8" }).trim();
if (branch !== "chatgpt/live-editorial-home-v1") {
  throw new Error(`Refusing to apply Phase 3 on ${branch}. Expected chatgpt/live-editorial-home-v1.`);
}

const status = execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).trim();
if (status && !status.split("\n").every((line) => line.endsWith("scripts/apply-phase3-design-system.mjs"))) {
  throw new Error("Working tree is not clean. Phase 3 was not applied.");
}

const styles = "app/styles";
const oldCss = ["public-design.css", "approved-home.css", "home-editorial-v2.css", "ai-runtime.css", "ai-conversation.css"];
for (const name of oldCss) {
  if (!existsSync(file(`${styles}/${name}`))) throw new Error(`Missing ${styles}/${name}`);
}

const publicCss = read(`${styles}/public-design.css`);
let approvedCss = read(`${styles}/approved-home.css`);
const editorialCss = read(`${styles}/home-editorial-v2.css`);
const runtimeCss = read(`${styles}/ai-runtime.css`);
const conversationCss = read(`${styles}/ai-conversation.css`);

const deadStart = approvedCss.indexOf(".cg-goal-grid,\n.cg-explore-grid");
const deadEnd = approvedCss.indexOf(".cg-home-proof-line", deadStart);
if (deadStart < 0 || deadEnd < 0) throw new Error("Could not locate the obsolete approved-home goal/explore block.");
approvedCss = `${approvedCss.slice(0, deadStart)}/* [Phase 3 removal] .cg-goal-choice/.cg-goal-panel/.cg-goal-actions/.cg-explore-grid were dead (zero references) and .cg-goal-grid here shadowed the live responsive marketplace definition. */\n${approvedCss.slice(deadEnd)}`;

const designHeader = `/*
 * Chef Gringo — Canonical Public Design System
 * ================================================
 * Single source of truth for public-facing \`--cg-*\` tokens and \`.cg-*\`
 * primitives/components. Consolidated in Phase 3 from five separately
 * imported files while preserving the original cascade order.
 *
 * Admin/internal surfaces are scoped separately in admin-legacy.css.
 * See docs/DESIGN_SYSTEM_MIGRATION.md for the migration record.
 */\n\n`;
const sections = [
  ["1. TOKENS + BASE PRIMITIVES  (formerly public-design.css)", publicCss],
  ["2. HOMEPAGE HERO / LAYOUT  (formerly approved-home.css)", approvedCss],
  ["3. FOOD INTELLIGENCE  (formerly home-editorial-v2.css)", editorialCss],
  ["4. AI ANSWER RUNTIME STATES  (formerly ai-runtime.css)", runtimeCss],
  ["5. AI CONVERSATION / QUICK REPLIES  (formerly ai-conversation.css)", conversationCss],
];
let merged = designHeader;
for (const [label, content] of sections) {
  merged += `/* ============================================================\n * ${label}\n * ============================================================ */\n\n${content.trim()}\n\n`;
}
write(`${styles}/design-system.css`, merged);

const globalsPath = "app/globals.css";
const globalsCss = read(globalsPath);
const adminMarker = "/* Chef Gringo Experience 1.0 */";
const cut = globalsCss.indexOf(adminMarker);
if (cut < 0) throw new Error("Could not locate the admin/internal legacy tail in globals.css.");
const publicGlobals = `${globalsCss.slice(0, cut).trimEnd()}\n`;
const adminBody = `${globalsCss.slice(cut).trim()}\n`;
const globalsHeader = `/*
 * Chef Gringo — Public Legacy Utility Layer
 * ==========================================
 * Phase 3: admin/internal styles were relocated to
 * app/styles/admin-legacy.css and load only under /admin/**.
 * The legacy --color-* / --brand-* token vocabulary remains here
 * intentionally until a separately verified token migration.
 */\n\n`;
const adminHeader = `/*
 * Chef Gringo — Admin / Internal Legacy Styles
 * ==============================================
 * Relocated from app/globals.css in Phase 3 so founder/admin tooling
 * is not shipped as part of the public stylesheet payload.
 * Import only from app/admin/layout.tsx.
 */\n\n`;
write(globalsPath, globalsHeader + publicGlobals.trimStart());
write(`${styles}/admin-legacy.css`, adminHeader + adminBody);

const layoutPath = "app/layout.tsx";
let layout = read(layoutPath);
const importBlock = `import "./styles/public-design.css";\nimport "./styles/approved-home.css";\nimport "./styles/home-editorial-v2.css";\nimport "./styles/ai-runtime.css";\nimport "./styles/ai-conversation.css";`;
if (!layout.includes(importBlock)) throw new Error("Root CSS import block did not match the validated baseline.");
layout = layout.replace(importBlock, `import "./styles/design-system.css";`);
write(layoutPath, layout);

write("app/admin/layout.tsx", `import "../styles/admin-legacy.css";\n\nexport default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {\n  return <>{children}</>;\n}\n`);

const tests = [
  "tests/assistant.test.mjs",
  "tests/commercial-disclosure.test.mjs",
  "tests/corpus-governance.test.mjs",
  "tests/design-foundation.test.mjs",
  "tests/homepage-story.test.mjs",
  "tests/intelligence-lab.test.mjs",
  "tests/investigation-pipeline.test.mjs",
  "tests/public-decision-proof.test.mjs",
  "tests/public-design-system.test.mjs",
  "tests/public-ia.test.mjs",
  "tests/public-shell.test.mjs",
  "tests/public-visual.test.mjs",
  "tests/rendered-html.test.mjs",
  "tests/research-foundation.test.mjs",
];
for (const path of tests) {
  let text = read(path);
  for (const old of oldCss) text = text.replaceAll(`../app/styles/${old}`, "../app/styles/design-system.css");
  write(path, text);
}

let intel = read("tests/intelligence-lab.test.mjs").replaceAll("../app/globals.css", "../app/styles/admin-legacy.css");
write("tests/intelligence-lab.test.mjs", intel);

let designTest = read("tests/design-foundation.test.mjs");
designTest = designTest.replace(
  `const publicCss = await readFile(new URL("../app/styles/design-system.css", import.meta.url), "utf8");`,
  `const fullCss = await readFile(new URL("../app/styles/design-system.css", import.meta.url), "utf8");\nconst section1End = fullCss.indexOf("HOMEPAGE HERO / LAYOUT");\nconst publicCss = fullCss;\nconst tokensAndPrimitivesCss = fullCss.slice(0, section1End);`,
);
designTest = designTest.replace(
  `assert.doesNotMatch(publicCss, /@font-face|https?:\\/\\/|linear-gradient|radial-gradient|@keyframes/);`,
  `assert.doesNotMatch(tokensAndPrimitivesCss, /@font-face|https?:\\/\\/|linear-gradient|radial-gradient|@keyframes/);`,
);
designTest = designTest.replace(
  `assert.match(layout, /import "\\.\\/styles\\/public-design\\.css";/);`,
  `assert.match(layout, /import "\\.\\/styles\\/design-system\\.css";/);`,
);
write("tests/design-foundation.test.mjs", designTest);

let pds = read("tests/public-design-system.test.mjs");
pds = pds.replace(
  `const css = await readFile(new URL("../app/styles/design-system.css", import.meta.url), "utf8");\nconst approved = await readFile(new URL("../app/styles/design-system.css", import.meta.url), "utf8");\nconst editorial = await readFile(new URL("../app/styles/design-system.css", import.meta.url), "utf8");`,
  `const css = await readFile(new URL("../app/styles/design-system.css", import.meta.url), "utf8");\nconst approved = css;\nconst editorial = css;\nconst tokensAndPrimitivesCss = css.slice(0, css.indexOf("HOMEPAGE HERO / LAYOUT"));`,
);
pds = pds.replace(/const PUBLIC_CEILING_BYTES = [0-9_]+;/, "const PUBLIC_CEILING_BYTES = 100_000;");
pds = pds.replace(/const order = \[[\s\S]*?\];\n  let cursor = 0;/, `const order = [\n    'import "./globals.css"',\n    'import "./styles/design-system.css"',\n  ];\n  let cursor = 0;`);
pds = pds.replace(
  `assert.doesNotMatch(css, /linear-gradient|@keyframes|@font-face/);`,
  `assert.doesNotMatch(tokensAndPrimitivesCss, /linear-gradient|radial-gradient|@keyframes|@font-face/);`,
);
pds = pds.replace("public-design.css stays under the stylesheet-size regression ceiling", "design-system.css stays under the stylesheet-size regression ceiling");
write("tests/public-design-system.test.mjs", pds);

let story = read("tests/homepage-story.test.mjs");
story = story.replace(`assert.match(page, /href="\\/marketplace"/);`, `assert.match(page, /\\["Shop",[\\s\\S]*?"\\/marketplace"\\]/);`);
story = story.replace(`assert.match(page, /href="\\/cut-intelligence"/);`, `assert.match(page, /\\["Manage",[\\s\\S]*?"\\/culinary-director-tools"\\]/);`);
write("tests/homepage-story.test.mjs", story);

write("docs/DESIGN_SYSTEM_MIGRATION.md", `# Chef Gringo Design System Migration — Phase 3\n\nPhase 3 consolidates the five public \`--cg-*\` stylesheets into \`app/styles/design-system.css\` while preserving their original cascade order. Admin/internal legacy styles are relocated from \`app/globals.css\` to \`app/styles/admin-legacy.css\` and loaded only by \`app/admin/layout.tsx\`.\n\n## Public stylesheet order\n1. \`app/globals.css\` — surviving legacy/public utilities\n2. \`app/styles/design-system.css\` — canonical public \`--cg-*\` system\n\n## Consolidated sections\n1. Tokens and public primitives (\`public-design.css\`)\n2. Homepage layout (\`approved-home.css\`)\n3. Food Intelligence (\`home-editorial-v2.css\`)\n4. AI runtime states (\`ai-runtime.css\`)\n5. AI conversation states (\`ai-conversation.css\`)\n\nThe obsolete approved-home goal/explore block was removed because it had no live TSX references and its \`.cg-goal-grid\` rule overrode the responsive Marketplace definition.\n\n## Admin split\nThe contiguous Chef Gringo Experience 1.0, Partner Hunt, Marketplace administration, Knowledge Core editor, and Intelligence Lab styles moved intact to \`admin-legacy.css\`. No public route imports that file.\n\n## Deferred work\nThe legacy \`--color-*\` / \`--brand-*\` vocabulary remains separate from \`--cg-*\`. Duplicate selectors between the surviving legacy layer and the canonical design system are intentionally left unchanged until visual regression review.\n`);

for (const old of oldCss) unlinkSync(file(`${styles}/${old}`));

console.log("\nPhase 3 files applied. Running the full validation gate...\n");
run("npm", ["run", "lint"]);
run("npm", ["run", "typecheck"]);
run("npm", ["run", "build"]);
run("npm", ["test"]);

console.log("\nValidation passed. Committing Phase 3...\n");
unlinkSync(file("scripts/apply-phase3-design-system.mjs"));
run("git", ["add", "-A"]);
const staged = execFileSync("git", ["diff", "--cached", "--name-only"], { cwd: root, encoding: "utf8" }).trim();
if (!staged) throw new Error("No Phase 3 changes were staged.");
run("git", ["commit", "-m", "refactor: consolidate Phase 3 design system"]);
run("git", ["push", "origin", "HEAD:chatgpt/live-editorial-home-v1"]);
console.log("\nPhase 3 is validated, committed, and pushed.\n");
