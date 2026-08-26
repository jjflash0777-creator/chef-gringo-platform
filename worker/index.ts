/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
  CHEF_GRINGO_LOCAL_CORPUS_ENABLED?: string;
  CHEF_GRINGO_CORPUS_RETRIEVAL_ENABLED?: string;
  CHEF_GRINGO_CORPUS_INGEST_FETCH_ENABLED?: string;
  CHEF_GRINGO_AI_SEARCH_INSTANCE?: string;
  CHEF_GRINGO_CORPUS_DAILY_REQUEST_CEILING?: string;
  CHEF_GRINGO_LIVE_CANDIDATE_DISCOVERY?: string;
  CHEF_GRINGO_LIVE_SEARCH_ENDPOINT?: string;
  CHEF_GRINGO_LIVE_SEARCH_TOKEN?: string;
  MARKETPLACE_ADMIN_EMAILS?: string;
  /** Optional AI Search namespace binding. Not declared in hosting.json. See docs/GOVERNED_CORPUS.md. Do not use the legacy AutoRAG accessor. */
  AI_SEARCH?: {
    get(id: string): {
      search(input: Record<string, unknown>): Promise<{ chunks?: Array<Record<string, unknown>> }>;
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    (globalThis as typeof globalThis & { __CHEF_GRINGO_ENV__?: Env }).__CHEF_GRINGO_ENV__ = env;
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
