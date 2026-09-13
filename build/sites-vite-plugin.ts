import { access, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import type { Plugin } from "vite";

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function gitCommitSha(root: string): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

async function homepageSourceHash(root: string): Promise<string> {
  const page = await readFile(resolve(root, "app", "page.tsx"), "utf8");
  const brand = await readFile(resolve(root, "app", "home", "brand-images.ts"), "utf8");
  return createHash("sha256").update(page).update("\n").update(brand).digest("hex");
}

// Packages Sites metadata and migrations after Vite finishes compiling.
export function sites(): Plugin {
  let root = process.cwd();

  return {
    name: "sites",
    apply: "build",
    configResolved(config) {
      root = config.root;
    },
    async closeBundle() {
      const outputDirectory = resolve(root, "dist", ".openai");
      const hostingConfig = resolve(root, ".openai", "hosting.json");
      const drizzleSource = resolve(root, "drizzle");

      await rm(outputDirectory, { recursive: true, force: true });
      await mkdir(outputDirectory, { recursive: true });

      let sitesProjectId: string | null = null;
      if (await exists(hostingConfig)) {
        await cp(hostingConfig, resolve(outputDirectory, "hosting.json"));
        try {
          const hosting = JSON.parse(await readFile(hostingConfig, "utf8")) as {
            project_id?: string;
          };
          sitesProjectId = hosting.project_id ?? null;
        } catch {
          sitesProjectId = null;
        }
      }
      if (await exists(drizzleSource)) {
        await cp(drizzleSource, resolve(outputDirectory, "drizzle"), {
          recursive: true,
        });
      }

      const environment =
        process.env.CHEF_GRINGO_ENVIRONMENT?.trim()
        || process.env.NODE_ENV?.trim()
        || "development";

      const fingerprint = {
        commitSha: gitCommitSha(root),
        builtAt: new Date().toISOString(),
        environment,
        sitesProjectId,
        homepageSourceHash: await homepageSourceHash(root),
      };
      await writeFile(
        resolve(outputDirectory, "build-fingerprint.json"),
        `${JSON.stringify(fingerprint, null, 2)}\n`,
        "utf8",
      );
    },
  };
}
