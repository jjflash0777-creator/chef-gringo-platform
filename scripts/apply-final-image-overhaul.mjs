import { existsSync, readFileSync, writeFileSync, rmSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";

const expectedBranch = "chatgpt/phase4-images-final";
const branch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
if (branch !== expectedBranch) {
  throw new Error(`Run this only on ${expectedBranch}; current branch is ${branch}`);
}

const requiredAssets = [
  "hero-kitchen.jpg",
  "operator-intelligence.jpg",
  "cooking-line.jpg",
  "dish-pit.jpg",
  "refrigeration.jpg",
  "repair-replace.jpg",
  "food-truck.jpg",
  "senior-living.jpg",
  "prep-station.jpg",
  "empty-kitchen.jpg",
];

const assetRoot = "public/brand/editorial";
for (const file of requiredAssets) {
  const path = `${assetRoot}/${file}`;
  if (!existsSync(path)) throw new Error(`Missing curated image: ${path}`);
  if (statSync(path).size < 10_000) throw new Error(`Curated image looks invalid: ${path}`);
}

const brandImages = `export const brandImages = {
  heroKitchen: { src: "/brand/editorial/hero-kitchen.jpg", alt: "Chef working the line in a professional kitchen" },
  operatorIntelligence: { src: "/brand/editorial/operator-intelligence.jpg", alt: "Chef reviewing operating notes and kitchen data after service" },
  cookingLine: { src: "/brand/editorial/cooking-line.jpg", alt: "Active commercial cooking line with open flame" },
  dishPit: { src: "/brand/editorial/dish-pit.jpg", alt: "Working dish area during a demanding kitchen shift" },
  refrigeration: { src: "/brand/editorial/refrigeration.jpg", alt: "Commercial refrigeration inside a working kitchen" },
  repairReplace: { src: "/brand/editorial/repair-replace.jpg", alt: "Kitchen operators inspecting equipment and repair costs" },
  foodTruck: { src: "/brand/editorial/food-truck.jpg", alt: "Cook working inside a food truck kitchen" },
  seniorLiving: { src: "/brand/editorial/senior-living.jpg", alt: "Chef and team preparing organized meal service" },
  prepStation: { src: "/brand/editorial/prep-station.jpg", alt: "Ingredient prep station with commercial food processor and mise en place" },
  emptyKitchen: { src: "/brand/editorial/empty-kitchen.jpg", alt: "Quiet commercial cooking line after service" },
} as const;
`;
writeFileSync("app/home/brand-images.ts", brandImages);

function replaceOrFail(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`Could not find ${label}`);
  return source.replace(from, to);
}

let page = readFileSync("app/page.tsx", "utf8");
page = replaceOrFail(
  page,
  'import { editorialImages } from "./home/editorial-images";',
  'import { brandImages } from "./home/brand-images";',
  "homepage image import",
);
page = replaceOrFail(
  page,
  '<Image unoptimized src={editorialImages.prep.src} alt="" width={1600} height={1067} priority />',
  '<Image unoptimized src={brandImages.heroKitchen.src} alt="" width={1600} height={1067} priority />',
  "hero image",
);
page = replaceOrFail(
  page,
  '<Image unoptimized src={editorialImages.service.src} alt={editorialImages.service.alt} width={1200} height={800} />',
  '<Image unoptimized src={brandImages.prepStation.src} alt={brandImages.prepStation.alt} width={1200} height={800} />',
  "food intelligence image",
);
page = replaceOrFail(
  page,
  '] as const;\n\nconst heroSignals = [',
  `] as const;\n\nconst pathwayImages: Record<(typeof platformPaths)[number][0], string> = {\n  Learn: brandImages.prepStation.src,\n  Solve: brandImages.repairReplace.src,\n  Build: brandImages.foodTruck.src,\n  Shop: brandImages.refrigeration.src,\n  Manage: brandImages.operatorIntelligence.src,\n};\n\nconst heroSignals = [`,
  "pathway image map insertion",
);
page = replaceOrFail(
  page,
  '<Link href={href} key={title}>\n                <small>0{index + 1}</small>',
  '<Link href={href} key={title}>\n                <span className="cg-home-pathway-media" aria-hidden="true" style={{ backgroundImage: `url(${pathwayImages[title]})` }} />\n                <small>0{index + 1}</small>',
  "pathway image markup",
);
writeFileSync("app/page.tsx", page);

let pulse = readFileSync("app/components/CulinaryPulse.tsx", "utf8");
pulse = replaceOrFail(
  pulse,
  'import styles from "./CulinaryPulse.module.css";',
  'import styles from "./CulinaryPulse.module.css";\nimport { brandImages } from "../home/brand-images";',
  "Culinary Pulse image import",
);
pulse = replaceOrFail(
  pulse,
  'const editorialImages = ["/images/editorial/commercial-kitchen-prep.jpg", "/images/editorial/restaurant-kitchen-service.jpg"];',
  `const storyImages = [\n  brandImages.heroKitchen.src,\n  brandImages.cookingLine.src,\n  brandImages.foodTruck.src,\n  brandImages.refrigeration.src,\n  brandImages.seniorLiving.src,\n  brandImages.dishPit.src,\n] as const;\nconst operatorImages = [\n  brandImages.operatorIntelligence.src,\n  brandImages.refrigeration.src,\n  brandImages.repairReplace.src,\n  brandImages.foodTruck.src,\n  brandImages.emptyKitchen.src,\n] as const;\nconst goalImages = [\n  brandImages.seniorLiving.src,\n  brandImages.prepStation.src,\n  brandImages.cookingLine.src,\n  brandImages.heroKitchen.src,\n] as const;`,
  "Culinary Pulse image arrays",
);
pulse = replaceOrFail(
  pulse,
  'function imageFor(index: number) { return editorialImages[index % editorialImages.length]; }',
  'function storyImage(index: number) { return storyImages[index % storyImages.length]; }\nfunction operatorImage(index: number) { return operatorImages[index % operatorImages.length]; }\nfunction goalImage(index: number) { return goalImages[index % goalImages.length]; }',
  "Culinary Pulse image helpers",
);
pulse = pulse.replaceAll('url(${imageFor(0)})', 'url(${storyImage(0)})');
pulse = pulse.replaceAll('url(${imageFor(index)})', 'url(${storyImage(index)})');
pulse = pulse.replaceAll('url(${imageFor(index + 1)})', 'url(${operatorImage(index)})');
// The health-goal rail should use food/service imagery, not the story rail.
pulse = pulse.replaceAll('url(${storyImage(index)})` }} /><section><span>{goal.label}', 'url(${goalImage(index)})` }} /><section><span>{goal.label}');
writeFileSync("app/components/CulinaryPulse.tsx", pulse);

let homeCss = readFileSync("app/styles/homepage-v4.css", "utf8");
homeCss = homeCss.replace(
  "url('/images/editorial/commercial-kitchen-prep.jpg') center/cover;",
  "url('/brand/editorial/prep-station.jpg') center/cover;",
);
homeCss += `\n\n/* Final curated-image pass: each pathway has its own operational visual. */\n.cg-home-v4 .cg-home-pathway-grid a { position: relative; overflow: hidden; isolation: isolate; }\n.cg-home-v4 .cg-home-pathway-grid a > *:not(.cg-home-pathway-media) { position: relative; z-index: 2; }\n.cg-home-pathway-media {\n  position: absolute;\n  inset: 0;\n  z-index: 0;\n  background-position: center;\n  background-size: cover;\n  filter: saturate(.58) contrast(1.06) brightness(.38);\n  transform: scale(1.02);\n}\n.cg-home-v4 .cg-home-pathway-grid a::after {\n  content: "";\n  position: absolute;\n  inset: 0;\n  z-index: 1;\n  background: linear-gradient(180deg, rgb(18 21 18 / 40%) 0%, rgb(18 21 18 / 88%) 76%, rgb(18 21 18 / 96%) 100%);\n}\n.cg-home-v4 .cg-home-pathway-grid a:hover .cg-home-pathway-media { filter: saturate(.75) contrast(1.08) brightness(.47); }\n@media (prefers-reduced-motion: reduce) { .cg-home-pathway-media { transform: none; } }\n`;
writeFileSync("app/styles/homepage-v4.css", homeCss);

let pulseCss = readFileSync("app/components/CulinaryPulse.module.css", "utf8");
pulseCss += `\n\n/* Curated imagery pass: reduce template feel and let each image breathe. */\n.visualCard,.operatorCard,.goalCard,.leadStory{box-shadow:0 14px 34px rgba(23,25,22,.08)}\n.cardImage{height:190px}\n.operatorImage{min-height:100%;background-position:center}\n@media(max-width:650px){.cardImage{height:155px}}\n`;
writeFileSync("app/components/CulinaryPulse.module.css", pulseCss);

// Retire the prior polish script so there is one canonical final pass.
if (existsSync("scripts/apply-phase4-visual-polish.mjs")) rmSync("scripts/apply-phase4-visual-polish.mjs");

console.log("Curated Chef Gringo image set detected and wired into the homepage.");
console.log("Running validation...");
for (const [cmd, args] of [
  ["npm", ["run", "lint"]],
  ["npm", ["run", "typecheck"]],
  ["npm", ["run", "build"]],
  ["npm", ["test"]],
]) {
  execFileSync(cmd, args, { stdio: "inherit" });
}

rmSync("scripts/apply-final-image-overhaul.mjs");
execFileSync("git", ["add", "app/page.tsx", "app/home/brand-images.ts", "app/components/CulinaryPulse.tsx", "app/components/CulinaryPulse.module.css", "app/styles/homepage-v4.css", "public/brand/editorial", "scripts/apply-final-image-overhaul.mjs", "scripts/apply-phase4-visual-polish.mjs"], { stdio: "inherit" });
execFileSync("git", ["commit", "-m", "feat: wire curated Chef Gringo imagery across homepage"], { stdio: "inherit" });
execFileSync("git", ["push", "-u", "origin", "HEAD"], { stdio: "inherit" });
console.log("Final curated-image homepage pass is validated, committed, and pushed.");
