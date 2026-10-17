import assert from "node:assert/strict";
import test from "node:test";
import { FACTORY_VERSION, PINTEREST_COPY_MAX, generateGrowthFactoryPackage } from "../app/growth/factory.ts";

test("growth factory fallback stays Buffer-safe and owned-site-only", async () => {
  const originalFetch = globalThis.fetch;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalBase = process.env.CHEF_GRINGO_AI_BASE_URL;
  const originalModel = process.env.CHEF_GRINGO_AI_MODEL;
  const originalKey = process.env.CHEF_GRINGO_AI_API_KEY;

  globalThis.fetch = async () => new Response(
    "<html><head><title>Carbonara</title></head><body><main><h1>Carbonara is all about technique.</h1><p>Control residual heat so the egg and cheese mixture turns glossy instead of scrambling.</p></main></body></html>",
    { status: 200, headers: { "content-type": "text/html" } },
  );
  process.env.NODE_ENV = "production";
  delete process.env.CHEF_GRINGO_AI_BASE_URL;
  delete process.env.CHEF_GRINGO_AI_MODEL;
  delete process.env.CHEF_GRINGO_AI_API_KEY;

  try {
    const pkg = await generateGrowthFactoryPackage({
      title: "Carbonara Technique",
      destinationPath: "/knowledge/dishes/carbonara",
      imageUrl: "https://chefgringo.com/brand/campaigns/review-guides/carbonara-technique.png",
    });

    assert.equal(pkg.version, FACTORY_VERSION);
    assert.equal(pkg.generatedBy, "fallback");
    assert.equal(pkg.destinationPath, "/knowledge/dishes/carbonara");
    assert.equal(pkg.sourceUrl, "https://chefgringo.com/knowledge/dishes/carbonara");
    assert.equal(pkg.pinterest.length <= PINTEREST_COPY_MAX, true);
    assert.equal(pkg.carouselSlides.length, 5);
    assert.match(pkg.campaignSlug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = originalNodeEnv;
    if (originalBase === undefined) delete process.env.CHEF_GRINGO_AI_BASE_URL; else process.env.CHEF_GRINGO_AI_BASE_URL = originalBase;
    if (originalModel === undefined) delete process.env.CHEF_GRINGO_AI_MODEL; else process.env.CHEF_GRINGO_AI_MODEL = originalModel;
    if (originalKey === undefined) delete process.env.CHEF_GRINGO_AI_API_KEY; else process.env.CHEF_GRINGO_AI_API_KEY = originalKey;
  }
});

test("growth factory rejects non-Chef-Gringo media", async () => {
  await assert.rejects(
    () => generateGrowthFactoryPackage({
      title: "Bad media",
      destinationPath: "/learn/test",
      imageUrl: "https://example.com/image.png",
    }),
    /hosted on chefgringo\.com/i,
  );
});
