import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Mirepoix flagship article keeps the finished production visual and editorial source contract", async () => {
  const page = await readFile(new URL("../app/learn/mirepoix-foundations-of-flavor/page.tsx", import.meta.url), "utf8");

  assert.match(page, /Mirepoix: The 300-Year Story Hiding Under Your Dinner/);
  assert.match(page, /A short timeline of how mirepoix became mirepoix/);
  assert.match(page, /1814 · Beauvilliers/);
  assert.match(page, /1903 · Escoffier/);
  assert.match(page, /The aromatic-base family is bigger than France/);
  assert.match(page, /Italy · Battuto &amp; soffritto/);
  assert.match(page, /Louisiana · Holy Trinity/);
  assert.match(page, /Want to understand it instead of memorize it\? Taste the variables/);

  assert.match(page, /rustic_mirepoix_saute_in_copper_pan\.png/);
  assert.match(page, /mirepoix_the_story_beneath_dinner\.png/);
  assert.match(page, /mirepoix_the_aromatic_foundation\.png/);

  assert.doesNotMatch(page, /social-[5-8]\.svg/);
  assert.match(page, /pubs\.acs\.org/);
  assert.match(page, /pubmed\.ncbi\.nlm\.nih\.gov\/18163555/);
  assert.match(page, /pmc\.ncbi\.nlm\.nih\.gov\/articles\/PMC10972819/);
});
