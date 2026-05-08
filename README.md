# react-doctor-benchmarks

Reproducible [`react-doctor`](https://github.com/millionco/react-doctor) scores for popular open-source React frontends.

The scores below are produced by GitHub Actions on a weekly cron (and on demand). Every entry is scanned with `npx react-doctor@latest --json --offline` against a fresh clone of the upstream repo, and the resulting JSON is committed alongside this README so the leaderboard is fully auditable.

## Leaderboard

<!-- LEADERBOARD:START -->
_The leaderboard renders here once the first benchmark run finishes. Trigger it manually from the **Actions** tab → **benchmark** → **Run workflow**._
<!-- LEADERBOARD:END -->

## How it works

1. [`repos.yaml`](repos.yaml) lists every benchmark target with its GitHub URL, the workspace project to scan, and any per-repo overrides (skip dead-code, skip install, etc.).
2. The [`benchmark`](.github/workflows/benchmark.yml) workflow fans out across the list using a matrix strategy. Each job clones one repo, attempts `pnpm/npm/yarn/bun install --ignore-scripts` (auto-detected from the lockfile), and runs `npx -y react-doctor@latest <scanDir> --json --offline --fail-on none`. If install fails, it falls back to `--no-dead-code` and scans the source anyway so a working score still lands.
3. A final `publish` job downloads every per-repo artifact, writes [`results/latest.json`](results/latest.json), regenerates this README's leaderboard table, and commits the diff back to `main` using the default `GITHUB_TOKEN`. If nothing changed (idempotent rendering), the commit step is a no-op.

The harness pins nothing about the upstream repos by default — every entry tracks `HEAD` of its default branch, and the SHA actually scanned is recorded in each result row so any score is reproducible. To pin a specific commit, set the `ref` field on a `repos.yaml` entry to a branch, tag, or SHA.

## Adding a project

Open a PR that adds an entry to [`repos.yaml`](repos.yaml). The schema is defined and validated in [`scripts/lib/config.ts`](scripts/lib/config.ts):

```yaml
- slug: my-project          # kebab-case, must be unique
  name: my-project          # display name in the leaderboard
  githubUrl: https://github.com/owner/repo
  scanDir: apps/web         # optional, default "."
  project: "@my/web"        # optional, passes --project to react-doctor
  packageManager: pnpm      # optional, auto-detected from lockfile
  skipDeadCode: false       # optional, true → pass --no-dead-code
  skipInstall: false        # optional, true → don't install (implies skipDeadCode)
```

Once merged, the entry shows up the next time the workflow runs (weekly cron, or click _Run workflow_ on the **benchmark** action).

## Reproducing locally

```bash
pnpm install
pnpm tsx scripts/benchmark-repo.ts dub        # scan one entry
pnpm tsx scripts/aggregate.ts                  # collect results/per-repo/*.json → results/latest.json
pnpm tsx scripts/render-readme.ts              # splice into README between markers
```

Set `REACT_DOCTOR_VERSION=1.2.3` to pin a specific upstream version (defaults to `latest`).

## Layout

| Path | What |
|------|------|
| [`repos.yaml`](repos.yaml) | Benchmark targets (canonical source of truth). |
| [`results/latest.json`](results/latest.json) | Aggregated leaderboard data; auto-generated. |
| `results/per-repo/<slug>.json` | Per-repo result; auto-generated. |
| [`scripts/`](scripts) | The harness (matrix prep, single-repo benchmark, aggregator, README renderer). |
| [`.github/workflows/benchmark.yml`](.github/workflows/benchmark.yml) | The automation. |

## Credits

Thirteen of the entries (`tldraw`, `excalidraw`, `twenty`, `plane`, `formbricks`, `posthog`, `supabase`, `onlook`, `payload`, `sentry`, `cal.com`, `dub`, `nodejs.org`) were originally compiled by hand for the [`react.doctor/leaderboard`](https://react.doctor/leaderboard) page in [`millionco/react-doctor`](https://github.com/millionco/react-doctor). This repo turns that snapshot into a self-updating, auditable benchmark and adds ten more popular OSS React apps.

## License

MIT.
