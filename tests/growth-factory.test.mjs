import assert from "node:assert/strict";
import test from "node:test";
import {
  FACTORY_VERSION,
  PINTEREST_COPY_MAX,
  extractSourceArticleText,
  generateGrowthFactoryPackage,
} from "../app/growth/factory.ts";

const inputs = {
  title: "Carbonara — It’s All About Technique",
  destinationPath: "/knowledge/dishes/carbonara",
  imageUrl: "https://chefgringo.com/brand/campaigns/review-guides/carbonara-technique.png",
};
const pageHtml = '<!doctype html><html><body><header>Chef Gringo Learn Shop Build Tools Ask Menu</header><main id="main"><header><h1>Carbonara is all about technique.</h1></header><nav>Jump to steps and tools</nav><p>Use residual heat to build a glossy sauce from eggs, Pecorino, guanciale, and pasta water.</p></main><footer>Site footer newsletter</footer><script>window.__NEXT_DATA__={"title":"fake"}</script></body></html>';

async function withFactoryEnvironment(setup, callback) {
  const oldFetch = globalThis.fetch;
  const previous = {};
  for (const key of ["NODE_ENV","CHEF_GRINGO_AI_BASE_URL","CHEF_GRINGO_AI_MODEL","CHEF_GRINGO_AI_API_KEY"]) {
    previous[key] = process.env[key];
  }
  try {
    process.env.NODE_ENV = "production";
    setup();
    return await callback();
  } finally {
    globalThis.fetch = oldFetch;
    for (const [key,value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function enableModel() {
  process.env.CHEF_GRINGO_AI_BASE_URL = "https://api.openai.com/v1";
  process.env.CHEF_GRINGO_AI_MODEL = "gpt-6-luna";
  process.env.CHEF_GRINGO_AI_API_KEY = "test-secret-never-log";
}

function modelPayload() {
  return {
    campaignSlug: "carbonara-technique-01",
    facebook: "Carbonara: eggs, cheese, pasta water, and residual heat. The sauce is made off heat. See the guide.",
    instagram: "The carbonara sauce should look glossy. Learn how heat control helps the emulsion come together.",
    pinterest: "Carbonara technique: use residual heat to bring eggs, cheese, and pasta water into a glossy sauce.",
    reelScript: "Visual hook: glossy carbonara. Explain how eggs and pasta water form the emulsion off heat.",
    carouselSlides: [
      "Carbonara: no cream needed",
      "Whisk eggs and Pecorino",
      "Render the guanciale",
      "Take the pan off heat",
      "Toss until glossy",
    ],
    visualBrief: "Show a pan of pasta, eggs and cheese, then the off-heat toss.",
    newsletterSubject: "This week's carbonara technique",
    newsletterTeaser: "Learn to build a glossy carbonara sauce with residual heat.",
  };
}

test("factory source extraction strips navigation and retains the recipe", () => {
  const text = extractSourceArticleText(pageHtml);
  assert.match(text, /residual heat/i);
  assert.match(text, /Carbonara is all about technique/i);
  assert.doesNotMatch(text, /Learn Shop Build Tools/);
  assert.doesNotMatch(text, /Jump to steps/);
  assert.doesNotMatch(text, /Site footer newsletter/);
  assert.doesNotMatch(text, /__NEXT_DATA__/);
});

test("factory fallback is clearly identified and sourced from the recipe body", async () => {
  await withFactoryEnvironment(() => {
    delete process.env.CHEF_GRINGO_AI_BASE_URL;
    delete process.env.CHEF_GRINGO_AI_MODEL;
    delete process.env.CHEF_GRINGO_AI_API_KEY;
    globalThis.fetch = async () => new Response(pageHtml, { status: 200 });
  }, async () => {
    const pkg = await generateGrowthFactoryPackage(inputs);
    assert.equal(pkg.version, FACTORY_VERSION);
    assert.equal(pkg.generatedBy, "fallback");
    assert.equal(pkg.fallbackReason, "ai_not_configured");
    assert.equal(pkg.providerStatus, null);
    assert.equal(pkg.sourceUrl, "https://chefgringo.com/knowledge/dishes/carbonara");
    assert.equal(pkg.pinterest.length <= PINTEREST_COPY_MAX, true);
    assert.equal(pkg.carouselSlides.length, 5);
    assert.doesNotMatch(pkg.facebook, /Shop Build Tools/);
  });
});

test("live Luna uses dedicated JSON schema without unsupported temperature parameter", async () => {
  await withFactoryEnvironment(() => {
    enableModel();
    globalThis.fetch = async (url, options) => {
      if (String(url).startsWith("https://chefgringo.com")) return new Response(pageHtml, { status: 200 });
      assert.equal(url, "https://api.openai.com/v1/chat/completions");
      const payload = JSON.parse(String(options.body));
      assert.equal(payload.model, "gpt-6-luna");
      assert.equal(payload.reasoning_effort, "none");
      assert.equal("temperature" in payload, false);
      assert.equal(payload.response_format.type, "json_schema");
      assert.equal(payload.response_format.json_schema.strict, true);
      assert.match(payload.messages[1].content, /residual heat/i);
      assert.doesNotMatch(payload.messages[1].content, /Learn Shop Build Tools/);
      return Response.json({ choices: [{ message: { content: JSON.stringify(modelPayload()) } }] });
    };
  }, async () => {
    const pkg = await generateGrowthFactoryPackage(inputs);
    assert.equal(pkg.generatedBy, "ai");
    assert.equal(pkg.fallbackReason, null);
    assert.equal(pkg.providerStatus, null);
    assert.equal(pkg.pinterest.length <= PINTEREST_COPY_MAX, true);
    assert.equal(pkg.carouselSlides.length, 5);
  });
});

test("provider error reports only safe HTTP status and code, never API-key material", async () => {
  await withFactoryEnvironment(() => {
    enableModel();
    globalThis.fetch = async (url) => String(url).startsWith("https://chefgringo.com")
      ? new Response(pageHtml, { status: 200 })
      : Response.json({ error: { code: "unsupported_parameter", message: "redacted-secret-test" } }, { status: 400 });
  }, async () => {
    const pkg = await generateGrowthFactoryPackage(inputs);
    assert.equal(pkg.generatedBy, "fallback");
    assert.equal(pkg.fallbackReason, "ai_provider_error");
    assert.equal(pkg.providerStatus, 400);
    assert.equal(pkg.providerErrorCode, "unsupported_parameter");
    assert.doesNotMatch(JSON.stringify(pkg), /test-secret-never-log|redacted-secret-test/);
  });
});

test("incomplete AI content cannot be mislabeled as a successful AI package", async () => {
  await withFactoryEnvironment(() => {
    enableModel();
    globalThis.fetch = async (url) => String(url).startsWith("https://chefgringo.com")
      ? new Response(pageHtml, { status: 200 })
      : Response.json({ choices: [{ message: { content: JSON.stringify({ answer: "Not a social package" }) } }] });
  }, async () => {
    const pkg = await generateGrowthFactoryPackage(inputs);
    assert.equal(pkg.generatedBy, "fallback");
    assert.equal(pkg.fallbackReason, "invalid_ai_response");
  });
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
