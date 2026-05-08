/**
 * Shared types for the benchmark harness.
 */

import type { RepoConfig } from "./config.ts";

export type BenchmarkStatus = "ok" | "install-failed" | "scan-failed" | "skipped";

export interface InstallSummary {
  attempted: boolean;
  success: boolean;
  packageManager?: string;
  durationMs?: number;
  errorMessage?: string;
}

export interface BenchmarkResult {
  /** Schema version for results JSON; bump when shape changes. */
  schemaVersion: 1;
  slug: string;
  name: string;
  githubUrl: string;
  ref: string;
  /** SHA we actually scanned, captured via `git rev-parse HEAD`. */
  commitSha: string | null;
  /** ISO 8601 UTC. */
  scannedAt: string;
  /** From JsonReport.version (react-doctor version). */
  doctorVersion: string | null;
  /** 0–100, or null on failure. */
  score: number | null;
  scoreLabel: string | null;
  errorCount: number;
  warningCount: number;
  affectedFileCount: number;
  totalDiagnosticCount: number;
  /** Wall-clock time spent inside react-doctor itself. */
  scanElapsedMs: number;
  install: InstallSummary;
  /** Whether --no-dead-code was passed (forced by config or by install failure). */
  skipDeadCode: boolean;
  status: BenchmarkStatus;
  errorMessage: string | null;
}

export interface AggregatedReport {
  schemaVersion: 1;
  generatedAt: string;
  /** Worst doctor version observed across results, for display. */
  doctorVersion: string | null;
  results: BenchmarkResult[];
}

export type { RepoConfig };
