#!/usr/bin/env tsx
/**
 * Emit the GitHub Actions matrix derived from repos.yaml. One JSON line.
 *
 * Used by `.github/workflows/benchmark.yml` to fan the benchmark out across
 * all targets without hard-coding them in the workflow file.
 */

import { loadRepos } from "./lib/config.ts";

function main(): void {
  const repos = loadRepos();
  const include = repos.map((repo) => ({ slug: repo.slug, name: repo.name }));
  const matrix = { include };
  // Single line output — GitHub Actions can't parse multi-line set-output payloads.
  process.stdout.write(JSON.stringify(matrix));
}

main();
