/**
 * Detect a target repo's package manager and run install with a hard timeout.
 *
 * react-doctor's lint pass works without node_modules, but its dead-code
 * (knip) pass needs imports to resolve. We attempt install; on failure or
 * timeout the caller falls back to --no-dead-code.
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { execa } from "execa";
import type { PackageManager } from "./config.ts";
import type { InstallSummary } from "./types.ts";

const DEFAULT_INSTALL_TIMEOUT_MS = 25 * 60 * 1000;

interface InstallOptions {
  packageManager?: PackageManager;
  extraArgs?: string[];
  timeoutMs?: number;
  /** Where to print the install's stdout/stderr (defaults to inherit). */
  stdio?: "inherit" | "pipe";
}

export function detectPackageManager(repoDir: string): PackageManager | undefined {
  if (existsSync(resolve(repoDir, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(resolve(repoDir, "yarn.lock"))) return "yarn";
  // bun.lock is the modern text lockfile (>=1.2); bun.lockb is the legacy
  // binary one. Detect both so repos like pingdotgg/t3code aren't treated
  // as "no lockfile" and silently skipped.
  if (existsSync(resolve(repoDir, "bun.lock"))) return "bun";
  if (existsSync(resolve(repoDir, "bun.lockb"))) return "bun";
  if (existsSync(resolve(repoDir, "package-lock.json"))) return "npm";
  return undefined;
}

function buildCommand(pm: PackageManager, extraArgs: string[]): { cmd: string; args: string[] } {
  switch (pm) {
    case "pnpm":
      return {
        cmd: "pnpm",
        args: [
          "install",
          "--ignore-scripts",
          "--no-frozen-lockfile",
          "--config.confirmModulesPurge=false",
          ...extraArgs,
        ],
      };
    case "yarn":
      // Works with both Classic and Berry (Berry treats --ignore-scripts as
      // unknown but the install still succeeds when corepack picks v3+).
      return { cmd: "yarn", args: ["install", "--ignore-scripts", ...extraArgs] };
    case "npm":
      return {
        cmd: "npm",
        args: ["install", "--ignore-scripts", "--legacy-peer-deps", "--no-audit", "--no-fund", ...extraArgs],
      };
    case "bun":
      return { cmd: "bun", args: ["install", "--ignore-scripts", ...extraArgs] };
  }
}

export async function installDeps(repoDir: string, options: InstallOptions = {}): Promise<InstallSummary> {
  const pm = options.packageManager ?? detectPackageManager(repoDir);
  if (!pm) {
    return { attempted: false, success: false, errorMessage: "no lockfile detected" };
  }

  const { cmd, args } = buildCommand(pm, options.extraArgs ?? []);
  const startedAt = Date.now();

  // Best-effort: corepack the right pm version if .package.json declares one.
  try {
    await execa("corepack", ["enable"], { cwd: repoDir, reject: false, timeout: 30_000 });
  } catch {
    /* corepack might not be available — fall through. */
  }

  console.log(`[install] ${pm}: ${cmd} ${args.join(" ")} (cwd=${repoDir})`);

  try {
    await execa(cmd, args, {
      cwd: repoDir,
      timeout: options.timeoutMs ?? DEFAULT_INSTALL_TIMEOUT_MS,
      stdio: options.stdio ?? "inherit",
      env: {
        ...process.env,
        CI: "true",
        // Silence interactive prompts that occasionally appear (yarn berry, etc.)
        FORCE_COLOR: "0",
        ADBLOCK: "1",
        DISABLE_OPENCOLLECTIVE: "1",
      },
    });
    return {
      attempted: true,
      success: true,
      packageManager: pm,
      durationMs: Date.now() - startedAt,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      attempted: true,
      success: false,
      packageManager: pm,
      durationMs: Date.now() - startedAt,
      errorMessage: truncate(message, 2000),
    };
  }
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max)}…`;
}
