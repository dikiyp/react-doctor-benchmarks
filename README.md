# react-doctor-benchmarks

Reproducible [`react-doctor`](https://github.com/millionco/react-doctor) scores for popular open-source React frontends.

The scores below are produced by GitHub Actions on a weekly cron (and on demand). Every entry is scanned with `npx react-doctor@latest --json --offline` against a fresh clone of the upstream repo, and the resulting JSON is committed alongside this README so the leaderboard is fully auditable.

## Leaderboard

<!-- LEADERBOARD:START -->

| Rank | Project | Score | Errors | Warnings | Files | Commit |
|-----:|---------|:-----:|------:|--------:|------:|:------:|
| 1 | [trigger.dev](https://github.com/triggerdotdev/trigger.dev) | 🟢 `███████████████████░` **97**/100 | 0 | 445 | 226 | `3e6458f` |
| 2 | [executor](https://github.com/RhysSullivan/executor) | 🟢 `███████████████████░` **96**/100 | 3 | 3 | 4 | `ec3f61e` |
| 3 | [nodejs.org](https://github.com/nodejs/nodejs.org) | 🟢 `█████████████████░░░` **87**/100 | 0 | 191 | 176 | `125b760` |
| 4 | [tldraw](https://github.com/tldraw/tldraw) | 🟢 `███████████████░░░░░` **76**/100 | 5 | 94 | 51 | `2eb9f83` |
| 5 | [t3code](https://github.com/pingdotgg/t3code) | 🟢 `███████████████░░░░░` **75**/100 | 0 | 723 | 242 | `131234b` |
| 6 | [excalidraw](https://github.com/excalidraw/excalidraw) | 🟡 `██████████████░░░░░░` **69**/100 | 1 | 497 | 156 | `b2b2815` |
| 7 | [payload](https://github.com/payloadcms/payload) | 🟡 `██████████████░░░░░░` **69**/100 | 1 | 750 | 391 | `e1442e7` |
| 8 | [rocket.chat](https://github.com/RocketChat/Rocket.Chat) | 🟡 `█████████████░░░░░░░` **67**/100 | 38 | 567 | 394 | `2a927fa` |
| 9 | [typebot](https://github.com/baptisteArno/typebot.io) | 🟡 `█████████████░░░░░░░` **66**/100 | 2 | 315 | 175 | `85eb843` |
| 10 | [plane](https://github.com/makeplane/plane) | 🟡 `█████████████░░░░░░░` **65**/100 | 1 | 1004 | 562 | `4c1bdd1` |
| 11 | [medusajs/admin](https://github.com/medusajs/medusa) | 🟡 `█████████████░░░░░░░` **65**/100 | 7 | 578 | 240 | `15c938b` |
| 12 | [unkey](https://github.com/unkeyed/unkey) | 🟡 `████████████░░░░░░░░` **62**/100 | 2 | 703 | 290 | `d14a778` |
| 13 | [shadcn/ui](https://github.com/shadcn-ui/ui) | 🟡 `████████████░░░░░░░░` **60**/100 | 4 | 1825 | 825 | `fc1ca40` |
| 14 | [twenty](https://github.com/twentyhq/twenty) | 🟡 `████████████░░░░░░░░` **59**/100 | 78 | 1322 | 878 | `0d05788` |
| 15 | [formbricks](https://github.com/formbricks/formbricks) | 🟡 `███████████░░░░░░░░░` **56**/100 | 8 | 1298 | 497 | `7e2c439` |
| 16 | [langfuse](https://github.com/langfuse/langfuse) | 🟡 `███████████░░░░░░░░░` **54**/100 | 24 | 1501 | 518 | `4c9fc1c` |
| 17 | [onlook](https://github.com/onlook-dev/onlook) | 🟡 `██████████░░░░░░░░░░` **52**/100 | 56 | 988 | 287 | `a242be5` |
| 18 | [appsmith](https://github.com/appsmithorg/appsmith) | 🟡 `██████████░░░░░░░░░░` **50**/100 | 89 | 1620 | 786 | `c268bce` |
| 19 | [cal.com](https://github.com/calcom/cal.com) | 🔴 `██████████░░░░░░░░░░` **48**/100 | 13 | 598 | 247 | `a4a01a0` |
| 20 | [lobehub/lobe-chat](https://github.com/lobehub/lobe-chat) | 🔴 `██████████░░░░░░░░░░` **48**/100 | 6 | 2261 | 604 | `83bc73c` |
| 21 | [posthog](https://github.com/PostHog/posthog) | 🔴 `█████████░░░░░░░░░░░` **45**/100 | 612 | 4273 | 1534 | `525446c` |
| 22 | [supabase](https://github.com/supabase/supabase) | 🔴 `█████████░░░░░░░░░░░` **45**/100 | 18 | 2090 | 914 | `04c9fb7` |
| 23 | [tooljet](https://github.com/ToolJet/ToolJet) | 🔴 `█████████░░░░░░░░░░░` **45**/100 | 154 | 5595 | 1303 | `f2f18d1` |
| 24 | [dub](https://github.com/dubinc/dub) | 🔴 `████████░░░░░░░░░░░░` **42**/100 | 40 | 2180 | 873 | `a5fa025` |
| 25 | [sentry](https://github.com/getsentry/sentry) | 🔴 `████████░░░░░░░░░░░░` **41**/100 | 52 | 3171 | 1543 | `84e2c71` |

<sub>Last updated <strong>2026-05-08T10:28:25.393Z</strong> · react-doctor `0.0.47` · 25 scored, 0 skipped/failed · raw results in [`results/latest.json`](results/latest.json)</sub>

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
