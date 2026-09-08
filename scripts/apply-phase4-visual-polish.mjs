import { readFile, writeFile, unlink } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const homeCssPath = `${root}/app/styles/homepage-v4.css`;
const pulseCssPath = `${root}/app/components/CulinaryPulse.module.css`;

function run(command, args = []) {
  execFileSync(command, args, { cwd: root, stdio: "inherit" });
}

let homeCss = await readFile(homeCssPath, "utf8");
let pulseCss = await readFile(pulseCssPath, "utf8");

const homePolish = `

/* Phase 4 visual QA polish: simplify hero, reduce visual noise, and tighten hierarchy. */
.cg-home-v4 .cg-home-v4-proof-card { display: none; }
.cg-home-v4 .cg-home-v4-hero-board {
  max-width: 25rem;
  align-self: center;
  justify-self: end;
}
.cg-home-v4 .cg-approved-quote {
  padding: clamp(1.5rem, 3vw, 2rem);
  border-left-width: 4px;
  background: rgb(8 8 8 / 82%);
}
.cg-home-v4 .cg-approved-quote::before { height: 2.5rem; }
.cg-home-v4 .cg-approved-quote strong {
  font-size: clamp(1.35rem, 2.1vw, 1.7rem);
  line-height: 1.08;
}
.cg-home-v4 .cg-approved-quote small { margin-top: 1rem; }
.cg-home-v4 .cg-approved-intake { padding-block: clamp(1.65rem, 4vw, 2.75rem); }
.cg-home-v4 .cg-food-intelligence { padding-block: clamp(3.25rem, 6vw, 5.5rem); }
@media (max-width: 64rem) {
  .cg-home-v4 .cg-home-v4-hero-board { max-width: none; justify-self: stretch; }
}
`;

if (!homeCss.includes("Phase 4 visual QA polish")) homeCss += homePolish;

pulseCss = pulseCss
  .replace(".pulse{padding:5rem 0 5.5rem;", ".pulse{padding:3.5rem 0 4.75rem;")
  .replace("margin:4.5rem 0 1.25rem", "margin:3.5rem 0 1.15rem")
  .replace("grid-auto-columns:minmax(310px,370px)", "grid-auto-columns:minmax(285px,330px)")
  .replace("font:700 1.32rem/1.04 Georgia", "font:700 1.2rem/1.08 Georgia");

const pulsePolish = `

/* Phase 4 visual QA polish: stop repeating the same two editorial photos across every signal. */
.visualCard:nth-child(n+3) .cardImage { display: none; }
.visualCard:nth-child(n+3) .cardBody {
  min-height: 215px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding-top: 1.25rem;
}
.visualCard:nth-child(n+3) .cardBody small { margin-top: auto; padding-top: 1rem; }
.visualCard:nth-child(3n) { background: #f0e7d7; }
.visualCard:nth-child(4n) { background: #e8ede7; }
.visualCard:nth-child(5n) { background: #f3eee6; }
.operatorCard { grid-template-columns: 1fr; }
.operatorCard .operatorImage { display: none; }
.operatorCard > div:last-child { min-height: 230px; }
.operatorCard:nth-child(3n) { background: #23342e; }
.operatorCard:nth-child(3n+2) { background: #fffaf2; color: #171713; }
.operatorCard:nth-child(3n+2) a { color: #9c3025; }
.goalCard:nth-child(even) { grid-template-columns: 1fr; }
.goalCard:nth-child(even) > div { display: none; }
.goalCard:nth-child(even) section { min-height: 230px; }
@media(max-width:650px){
  .visualCard:nth-child(n+3) .cardBody { min-height: 190px; }
  .operatorCard > div:last-child { min-height: 210px; }
}
`;

if (!pulseCss.includes("stop repeating the same two editorial photos")) pulseCss += pulsePolish;

await writeFile(homeCssPath, homeCss);
await writeFile(pulseCssPath, pulseCss);

run("npm", ["run", "lint"]);
run("npm", ["run", "typecheck"]);
run("npm", ["run", "build"]);
run("npm", ["test"]);

await unlink(`${root}/scripts/apply-phase4-visual-polish.mjs`);
run("git", ["add", "app/styles/homepage-v4.css", "app/components/CulinaryPulse.module.css", "scripts/apply-phase4-visual-polish.mjs"]);
run("git", ["commit", "-m", "polish: tighten Phase 4 homepage visual hierarchy"]);
run("git", ["push", "origin", "HEAD:chatgpt/phase4-homepage-v1"]);

console.log("Phase 4 visual polish is validated, committed, and pushed.");
