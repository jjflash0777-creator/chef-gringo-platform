import assert from "node:assert/strict";import {readFile} from "node:fs/promises";import test from "node:test";
import {chefGringoApplicationProfile} from "../app/growth/application-profile.ts";import {applicationPriority} from "../app/growth/application-priority.ts";import {COMMERCIAL_EVENT_NAMES,isCommercialEventName} from "../app/growth/commercial-events.ts";import {partnerHuntFixtures} from "../app/growth/partner-hunt-fixtures.ts";import {readiness,transitionPartner} from "../app/growth/partner-hunt.ts";import {getEmailCaptureHealth} from "../app/lib/engagement/emailHealth.ts";
test("public affiliate disclosure is reachable from legal and commercial surfaces",async()=>{const [page,shell,trust,sitemap]=await Promise.all(["../app/affiliate-disclosure/page.tsx","../app/components/PublicShell.tsx","../app/marketplace/components/TrustDisclosure.tsx","../app/sitemap.ts"].map(path=>readFile(new URL(path,import.meta.url),"utf8")));assert.match(page,/may receive a commission or referral compensation/);assert.match(page,/do not determine whether something is included/);for(const source of [shell,trust,sitemap])assert.match(source,/affiliate-disclosure/);});
test("application profile preserves unknown audience metrics",()=>{const profile=chefGringoApplicationProfile("https://chefgringo.com/");assert.equal(profile.websiteUrl,"https://chefgringo.com");assert.equal(profile.disclosureUrl,"https://chefgringo.com/affiliate-disclosure");assert.equal(profile.monthlyVisitors,null);assert.equal(profile.emailSubscribers,null);assert.equal(profile.socialFollowers,null);assert.doesNotMatch(JSON.stringify(profile),/\b[0-9]+ (visitors|subscribers|followers)\b/i);});
test("application-ready lifecycle cannot bypass canonical readiness",()=>{const record={...partnerHuntFixtures[0],lifecycle:"researching"};assert.equal(readiness(record,"apply").ready,false);assert.throws(()=>transitionPartner(record,"ready_to_apply"),/not ready to apply/);});
test("email health reports configuration without exposing credentials",()=>{const token="top-secret-token";const absent=getEmailCaptureHealth({});assert.equal(absent.status,"NOT CONFIGURED");const ready=getEmailCaptureHealth({EARLY_ACCESS_ENDPOINT:"https://app.loops.so/api/v1/contacts/update",EARLY_ACCESS_TOKEN:token});assert.equal(ready.status,"READY");assert.doesNotMatch(JSON.stringify(ready),new RegExp(token));assert.equal("token" in ready,false);});
test("commercial events are canonical and create no fake funnel metrics",()=>{for(const name of ["page_view","merchant_click","affiliate_click","email_signup","sale","commission_paid"])assert.equal(isCommercialEventName(name),true);assert.equal(isCommercialEventName("sale_created_by_default"),false);assert.equal(COMMERCIAL_EVENT_NAMES.some(name=>/amount|revenue|count/i.test(name)),false);});
test("priority states use governance rather than invented commercial scores",()=>{assert.equal(applicationPriority(partnerHuntFixtures[0]),"DIRECT OUTREACH");assert.equal(applicationPriority(partnerHuntFixtures[1]),"REJECTED");});

test("all active campaign pages persist affiliate click intent", async () => {
  const pages = [
    "../app/go/thermoworks/page.tsx",
    "../app/go/toast/page.tsx",
    "../app/go/crazy-good-buy/page.tsx",
    "../app/go/bluetti/page.tsx",
    "../app/go/kitchen-os/page.tsx",
  ];
  for (const page of pages) {
    const source = await readFile(new URL(page, import.meta.url), "utf8");
    assert.match(source, /data-event="affiliate_click"/, page);
    assert.match(source, /data-content-id=/, page);
    assert.match(source, /data-placement=/, page);
  }
});

test("marketplace affiliate copy does not claim zero monetization", async () => {
  const source = await readFile(new URL("../app/marketplace/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /no product on this page earns Chef Gringo anything today/i);
  assert.match(source, /Some products may use disclosed affiliate links/);
});
