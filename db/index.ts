import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema.ts";

export function getDb() {
  const runtime = globalThis as typeof globalThis & {
    __CHEF_GRINGO_ENV__?: { DB?: Parameters<typeof drizzle>[0] };
  };
  const binding = runtime.__CHEF_GRINGO_ENV__?.DB;
  if (!binding) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(binding, { schema });
}
