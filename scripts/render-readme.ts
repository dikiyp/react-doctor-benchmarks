#!/usr/bin/env tsx
/**
 * Splice the rendered leaderboard table into README.md between the
 * <!-- LEADERBOARD:START --> and <!-- LEADERBOARD:END --> markers.
 *
 * Idempotent: if the new README content is byte-identical to the existing
 * file, no write happens (so the workflow's commit step turns into a no-op).
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderLeaderboard, spliceLeaderboard } from "./lib/render.ts";
import type { AggregatedReport } from "./lib/types.ts";

const LATEST_PATH = resolve(process.cwd(), "results", "latest.json");
const README_PATH = resolve(process.cwd(), "README.md");

async function main(): Promise<void> {
  const reportRaw = await readFile(LATEST_PATH, "utf8");
  const report = JSON.parse(reportRaw) as AggregatedReport;

  const existing = await readFile(README_PATH, "utf8");
  const block = renderLeaderboard(report);
  const next = spliceLeaderboard(existing, block);

  if (next === existing) {
    console.log("README.md leaderboard block unchanged; no write.");
    return;
  }

  await writeFile(README_PATH, next, "utf8");
  console.log(`✓ wrote ${README_PATH} (leaderboard block updated)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
