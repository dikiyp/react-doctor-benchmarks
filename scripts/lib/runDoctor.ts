/**
 * Invoke `npx -y react-doctor@latest <dir> --json --offline …` and parse the
 * JSON report. We rely on the JsonReport schema documented in the upstream
 * README at https://github.com/millionco/react-doctor.
 */

import { execa } from "execa";

const DEFAULT_SCAN_TIMEOUT_MS = 30 * 60 * 1000;

const STDOUT_HEAD_FOR_ERRORS = 4096;

export interface RunDoctorOptions {
  project?: string;
  skipDeadCode?: boolean;
  /** Hard timeout in ms; defaults to 30min. */
  timeoutMs?: number;
  /** Pinned react-doctor version (defaults to "latest"). */
  doctorVersion?: string;
}

/**
 * Diagnostic shape we care about (full schema lives in upstream).
 */
export interface DoctorJsonReport {
  schemaVersion: 1;
  version: string;
  ok: boolean;
  directory: string;
  mode: "full" | "diff" | "staged";
  summary: {
    errorCount: number;
    warningCount: number;
    affectedFileCount: number;
    totalDiagnosticCount: number;
    score: number | null;
    scoreLabel: string | null;
  };
  elapsedMilliseconds: number;
  error: { message: string; name: string; chain: string[] } | null;
}

export interface DoctorRunOutcome {
  report: DoctorJsonReport;
  /** Wall-clock time we spent waiting on the child process. */
  wallTimeMs: number;
}

export async function runDoctor(scanDir: string, options: RunDoctorOptions = {}): Promise<DoctorRunOutcome> {
  const version = options.doctorVersion ?? "latest";
  const args: string[] = ["-y", `react-doctor@${version}`, scanDir, "--json", "--offline", "--fail-on", "none"];
  if (options.project) args.push("--project", options.project);
  if (options.skipDeadCode) args.push("--no-dead-code");

  console.log(`[scan] npx ${args.join(" ")}`);

  const startedAt = Date.now();

  const result = await execa("npx", args, {
    timeout: options.timeoutMs ?? DEFAULT_SCAN_TIMEOUT_MS,
    reject: false,
    stripFinalNewline: true,
    // We want stdout for the JSON payload, but stderr should still flow to the
    // CI log so a failed scan is debuggable.
    stdio: ["ignore", "pipe", "inherit"],
    env: {
      ...process.env,
      NO_COLOR: "1",
      // Be defensive — the CLI sometimes prompts when interactive.
      CI: "true",
    },
    maxBuffer: 64 * 1024 * 1024, // 64 MiB; some big repos emit large diagnostic JSON
  });

  const wallTimeMs = Date.now() - startedAt;
  const stdout = typeof result.stdout === "string" ? result.stdout : "";

  const report = parseReport(stdout);

  if (!report) {
    const exitClue = result.timedOut
      ? `timed out after ${(options.timeoutMs ?? DEFAULT_SCAN_TIMEOUT_MS) / 1000}s`
      : `exit ${result.exitCode ?? "?"}`;
    throw new Error(
      `react-doctor produced no parseable JSON (${exitClue}). First ${STDOUT_HEAD_FOR_ERRORS} bytes of stdout:\n` +
        stdout.slice(0, STDOUT_HEAD_FOR_ERRORS),
    );
  }

  if (report.schemaVersion !== 1) {
    throw new Error(`unexpected react-doctor schemaVersion: ${String(report.schemaVersion)}`);
  }

  return { report, wallTimeMs };
}

function parseReport(stdout: string): DoctorJsonReport | null {
  const trimmed = stdout.trim();
  if (!trimmed) return null;

  // Fast path: stdout is a single JSON object.
  try {
    return JSON.parse(trimmed) as DoctorJsonReport;
  } catch {
    /* fall through */
  }

  // Fallback: extract the last top-level JSON object in stdout. react-doctor's
  // --json mode is supposed to suppress all other output, but some installers
  // (npx download progress, pnpm corepack notices) sneak text in front of it.
  const lastBrace = trimmed.lastIndexOf("}");
  if (lastBrace < 0) return null;
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] !== "{") continue;
    const candidate = trimmed.slice(i, lastBrace + 1);
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && "schemaVersion" in parsed) {
        return parsed as DoctorJsonReport;
      }
    } catch {
      /* keep scanning */
    }
  }
  return null;
}
