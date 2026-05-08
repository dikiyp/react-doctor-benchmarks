#!/usr/bin/env tsx
/**
 * Benchmark a single repo:
 *
 *   pnpm tsx scripts/benchmark-repo.ts <slug>
 *
 * Steps:
 *   1. Look up the slug in repos.yaml.
 *   2. Clone (shallow) into a temp dir, capture the SHA we actually scanned.
 *   3. Optionally install deps (skipped if config.skipInstall or no lockfile).
 *   4. Run `npx react-doctor@latest <scanDir> --json --offline …`.
 *   5. Write a typed BenchmarkResult to `results/per-repo/<slug>.json`.
 *
 * Exit codes:
 *   0 on success — including scan failures (those are encoded in the result).
 *   1 on configuration / clone / unexpected errors (so a typo in repos.yaml
 *     is loud in CI).
 *   2 if the slug is unknown.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execa } from "execa";
import { findRepoBySlug, loadRepos } from "./lib/config.ts";
import { installDeps } from "./lib/installDeps.ts";
import { runDoctor, type DoctorJsonReport } from "./lib/runDoctor.ts";
import type { BenchmarkResult, InstallSummary, RepoConfig } from "./lib/types.ts";

const RESULTS_DIR = resolve(process.cwd(), "results", "per-repo");
const CLONE_TIMEOUT_MS = 10 * 60 * 1000; // git clone of huge repos can take a while
const DOCTOR_VERSION = process.env.REACT_DOCTOR_VERSION ?? "latest";

async function main(): Promise<void> {
  const slug = process.argv[2];
  if (!slug) {
    console.error("usage: benchmark-repo.ts <slug>");
    process.exit(1);
  }

  const repos = loadRepos();
  const repo = findRepoBySlug(repos, slug);
  if (!repo) {
    console.error(`unknown slug: ${slug}`);
    process.exit(2);
  }

  console.log(`▶ benchmarking ${repo.name} (${repo.githubUrl}@${repo.ref})`);

  const workdir = await mkdtemp(join(tmpdir(), `rdb-${slug}-`));
  const repoDir = join(workdir, "repo");

  let result: BenchmarkResult;

  try {
    const commitSha = await cloneRepo(repo, repoDir);
    result = await scanRepo(repo, repoDir, commitSha);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`✗ ${slug}: ${message}`);
    result = makeFailureResult(repo, "scan-failed", message);
  } finally {
    // Always clean up the workdir so the runner doesn't pile up gigabytes.
    await rm(workdir, { recursive: true, force: true }).catch(() => {});
  }

  await mkdir(RESULTS_DIR, { recursive: true });
  const outPath = join(RESULTS_DIR, `${slug}.json`);
  await writeFile(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(
    `✓ wrote ${outPath} — score=${result.score ?? "—"} status=${result.status} errors=${result.errorCount} warnings=${result.warningCount}`,
  );
}

async function cloneRepo(repo: RepoConfig, repoDir: string): Promise<string | null> {
  console.log(`[clone] ${repo.githubUrl}@${repo.ref} → ${repoDir}`);

  // For HEAD, we don't pass --branch (let git pick the default). For a named
  // ref we try shallow clone with --branch; if that fails (e.g. SHA, not a
  // branch/tag) we fall back to a shallow clone of the default branch and
  // fetch + checkout the requested ref.
  const args = ["clone", "--depth", "1", "--single-branch"];
  if (repo.ref !== "HEAD") {
    args.push("--branch", repo.ref);
  }
  args.push(repo.githubUrl, repoDir);

  try {
    await execa("git", args, { timeout: CLONE_TIMEOUT_MS, stdio: "inherit" });
  } catch {
    if (repo.ref === "HEAD") throw new Error(`git clone failed for ${repo.githubUrl}`);
    // Retry path for SHAs.
    console.warn(`[clone] --branch ${repo.ref} failed, retrying with full fetch + checkout`);
    await execa("git", ["clone", "--depth", "50", repo.githubUrl, repoDir], {
      timeout: CLONE_TIMEOUT_MS,
      stdio: "inherit",
    });
    await execa("git", ["fetch", "origin", repo.ref], {
      cwd: repoDir,
      timeout: CLONE_TIMEOUT_MS,
      stdio: "inherit",
    });
    await execa("git", ["checkout", "FETCH_HEAD"], { cwd: repoDir, stdio: "inherit" });
  }

  try {
    const { stdout } = await execa("git", ["rev-parse", "HEAD"], { cwd: repoDir });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function scanRepo(repo: RepoConfig, repoDir: string, commitSha: string | null): Promise<BenchmarkResult> {
  const scanDir = resolve(repoDir, repo.scanDir);
  if (!existsSync(scanDir)) {
    return {
      ...makeBaseResult(repo, commitSha),
      status: "scan-failed",
      errorMessage: `scanDir does not exist after clone: ${repo.scanDir}`,
    };
  }

  let install: InstallSummary = { attempted: false, success: false };
  let skipDeadCode = repo.skipDeadCode;

  if (!repo.skipInstall) {
    install = await installDeps(repoDir, {
      packageManager: repo.packageManager,
      extraArgs: repo.installArgs,
    });
    if (!install.success) {
      console.warn(`[install] failed for ${repo.slug}; falling back to --no-dead-code`);
      skipDeadCode = true;
    }
  } else {
    console.log(`[install] skipped (skipInstall=true); forcing --no-dead-code`);
    skipDeadCode = true;
  }

  let report: DoctorJsonReport;
  let scanElapsedMs: number;
  try {
    const outcome = await runDoctor(scanDir, {
      project: repo.project,
      skipDeadCode,
      doctorVersion: DOCTOR_VERSION,
    });
    report = outcome.report;
    scanElapsedMs = outcome.wallTimeMs;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ...makeBaseResult(repo, commitSha),
      install,
      skipDeadCode,
      status: install.attempted && !install.success ? "install-failed" : "scan-failed",
      errorMessage: message,
    };
  }

  if (!report.ok || report.summary.score === null) {
    return {
      ...makeBaseResult(repo, commitSha),
      doctorVersion: report.version,
      errorCount: report.summary.errorCount,
      warningCount: report.summary.warningCount,
      affectedFileCount: report.summary.affectedFileCount,
      totalDiagnosticCount: report.summary.totalDiagnosticCount,
      scanElapsedMs,
      install,
      skipDeadCode,
      status: "scan-failed",
      errorMessage: report.error?.message ?? "react-doctor produced no score",
    };
  }

  return {
    ...makeBaseResult(repo, commitSha),
    doctorVersion: report.version,
    score: report.summary.score,
    scoreLabel: report.summary.scoreLabel,
    errorCount: report.summary.errorCount,
    warningCount: report.summary.warningCount,
    affectedFileCount: report.summary.affectedFileCount,
    totalDiagnosticCount: report.summary.totalDiagnosticCount,
    scanElapsedMs,
    install,
    skipDeadCode,
    status: "ok",
    errorMessage: null,
  };
}

function makeBaseResult(repo: RepoConfig, commitSha: string | null): BenchmarkResult {
  return {
    schemaVersion: 1,
    slug: repo.slug,
    name: repo.name,
    githubUrl: repo.githubUrl,
    ref: repo.ref,
    commitSha,
    scannedAt: new Date().toISOString(),
    doctorVersion: null,
    score: null,
    scoreLabel: null,
    errorCount: 0,
    warningCount: 0,
    affectedFileCount: 0,
    totalDiagnosticCount: 0,
    scanElapsedMs: 0,
    install: { attempted: false, success: false },
    skipDeadCode: repo.skipDeadCode,
    status: "ok",
    errorMessage: null,
  };
}

function makeFailureResult(repo: RepoConfig, status: "scan-failed", message: string): BenchmarkResult {
  return {
    ...makeBaseResult(repo, null),
    status,
    errorMessage: message,
  };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
