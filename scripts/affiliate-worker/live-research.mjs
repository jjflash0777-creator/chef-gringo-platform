#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import { canAppearVerified, readiness } from "../../app/growth/partner-hunt.ts";
import { acquireFirstPartyPages, createBrowserUseReader } from "./browser-research.mjs";
import { applyResearchPages } from "./research.mjs";
import { createDiscoveredPartnerCandidate } from "./run.mjs";

export function researchDiscoveredPartner({ providerName, website, browser = createBrowserUseReader() }) {
  const discovered = createDiscoveredPartnerCandidate({ providerName, website });
  const acquisition = acquireFirstPartyPages({ website: discovered.website, browser });
  const result = applyResearchPages(discovered, acquisition);

  return {
    ...result,
    verificationBefore: discovered.verification,
    verificationAfter: result.candidate.verification,
    readiness: {
      apply: readiness(result.candidate, "apply"),
      outreach: readiness(result.candidate, "outreach"),
      canAppearVerified: canAppearVerified(result.candidate),
    },
  };
}

function isMainModule() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isMainModule()) {
  const [providerName, website] = process.argv.slice(2);
  if (!providerName || !website) {
    console.error('Usage: node scripts/affiliate-worker/live-research.mjs "Provider Name" "https://example.com"');
    process.exitCode = 1;
  } else {
    try {
      console.log(JSON.stringify(researchDiscoveredPartner({ providerName, website }), null, 2));
    } catch (error) {
      console.error(error instanceof Error ? error.message : "Partner research failed");
      process.exitCode = 1;
    }
  }
}
