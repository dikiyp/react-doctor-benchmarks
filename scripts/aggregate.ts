#!/usr/bin/env tsx
/**
 * Aggregate every per-repo result file into `results/latest.json`.
 *
 * Tolerant of missing slugs (a CI run with one job killed mid-flight still
 * publishes everything else). Writes a stable, sorted, pretty-printed JSON.
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { z } from "zod";
import { loadRepos } from "./lib/config.ts";
import type { AggregatedReport, BenchmarkResult } from "./lib/types.ts";

const PER_REPO_DIR = resolve(process.cwd(), "results", "per-repo");
const LATEST_PATH = resolve(process.cwd(), "results", "latest.json");

const ResultSchema = z.object({
  schemaVersion: z.literal(1),
  slug: z.string(),
  name: z.string(),
  githubUrl: z.string(),
  ref: z.string(),
  commitSha: z.string().nullable(),
  scannedAt: z.string(),
  doctorVersion: z.string().nullable(),
  score: z.number().nullable(),
  scoreLabel: z.string().nullable(),
  errorCount: z.number(),
  warningCount: z.number(),
  affectedFileCount: z.number(),
  totalDiagnosticCount: z.number(),
  scanElapsedMs: z.number(),
  install: z.object({
    attempted: z.boolean(),
    success: z.boolean(),
    packageManager: z.string().optional(),
    durationMs: z.number().optional(),
    errorMessage: z.string().optional(),
  }),
  skipDeadCode: z.boolean(),
  status: z.enum(["ok", "install-failed", "scan-failed", "skipped"]),
  errorMessage: z.string().nullable(),
});

async function main(): Promise<void> {
  const repos = loadRepos();
  await mkdir(PER_REPO_DIR, { recursive: true });

  const files = (await readdir(PER_REPO_DIR)).filter((name) => name.endsWith(".json"));
  const fromDisk = new Map<string, BenchmarkResult>();

  for (const file of files) {
    const path = join(PER_REPO_DIR, file);
    const raw = await readFile(path, "utf8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.warn(`[aggregate] skipping ${file}: invalid JSON (${(err as Error).message})`);
      continue;
    }
    const validated = ResultSchema.safeParse(parsed);
    if (!validated.success) {
      console.warn(`[aggregate] skipping ${file}: schema mismatch`);
      continue;
    }
    fromDisk.set(validated.data.slug, validated.data as BenchmarkResult);
  }

  // Build a result for every repo in repos.yaml. Repos with no on-disk result
  // get a "skipped" placeholder so the leaderboard always lists every target.
  const results: BenchmarkResult[] = repos.map((repo) => {
    const found = fromDisk.get(repo.slug);
    if (found) return found;
    return {
      schemaVersion: 1,
      slug: repo.slug,
      name: repo.name,
      githubUrl: repo.githubUrl,
      ref: repo.ref,
      commitSha: null,
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
      status: "skipped",
      errorMessage: "no result produced this run",
    };
  });

  results.sort((a, b) => {
    const aOk = a.status === "ok" && typeof a.score === "number";
    const bOk = b.status === "ok" && typeof b.score === "number";
    if (aOk && !bOk) return -1;
    if (!aOk && bOk) return 1;
    if (aOk && bOk) return (b.score ?? 0) - (a.score ?? 0);
    return a.slug.localeCompare(b.slug);
  });

  const doctorVersion = results.find((r) => r.doctorVersion)?.doctorVersion ?? null;

  const report: AggregatedReport = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    doctorVersion,
    results,
  };

  await writeFile(LATEST_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    `✓ wrote ${LATEST_PATH} (${results.length} repos; ` +
      `${results.filter((r) => r.status === "ok").length} scored)`,
  );

  // Friendly summary, also useful in CI logs.
  for (const r of results) {
    const score = typeof r.score === "number" ? `${r.score}/100` : "—";
    console.log(`  ${r.status.padEnd(15)} ${r.slug.padEnd(20)} ${score}`);
  }
  if (!existsSync(LATEST_PATH)) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
