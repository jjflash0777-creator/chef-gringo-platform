import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema.ts";

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[]; success?: boolean }>;
  run<T = Record<string, unknown>>(): Promise<{ results?: T[]; success?: boolean; meta?: Record<string, unknown> }>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
  batch<T = Record<string, unknown>>(statements: D1PreparedStatementLike[]): Promise<Array<{ results?: T[]; success?: boolean; meta?: Record<string, unknown> }>>;
}

export function getD1Binding(): D1DatabaseLike {
  const runtime = globalThis as typeof globalThis & {
    __CHEF_GRINGO_ENV__?: { DB?: D1DatabaseLike };
  };
  const binding = runtime.__CHEF_GRINGO_ENV__?.DB;
  if (!binding) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }
  return binding;
}

export function getDb() {
  return drizzle(getD1Binding() as Parameters<typeof drizzle>[0], { schema });
}
