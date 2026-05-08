/**
 * Markdown rendering for the leaderboard block injected into README.md.
 */

import type { AggregatedReport, BenchmarkResult } from "./types.ts";

const SCORE_GOOD_THRESHOLD = 75;
const SCORE_OK_THRESHOLD = 50;
const SCORE_BAR_WIDTH = 20;
const PERFECT_SCORE = 100;

export const LEADERBOARD_START_MARKER = "<!-- LEADERBOARD:START -->";
export const LEADERBOARD_END_MARKER = "<!-- LEADERBOARD:END -->";

function scoreBar(score: number): string {
  const filled = Math.round((score / PERFECT_SCORE) * SCORE_BAR_WIDTH);
  const empty = SCORE_BAR_WIDTH - filled;
  return `\`${"█".repeat(filled)}${"░".repeat(empty)}\``;
}

function scoreEmoji(score: number): string {
  if (score >= SCORE_GOOD_THRESHOLD) return "🟢";
  if (score >= SCORE_OK_THRESHOLD) return "🟡";
  return "🔴";
}

function formatProjectCell(result: BenchmarkResult): string {
  return `[${escapePipe(result.name)}](${result.githubUrl})`;
}

function escapePipe(value: string): string {
  return value.replace(/\|/g, "\\|");
}

function shortSha(sha: string | null): string {
  if (!sha) return "—";
  return sha.slice(0, 7);
}

function formatStatusBadge(status: BenchmarkResult["status"]): string {
  switch (status) {
    case "install-failed":
      return "⚠️ install failed";
    case "scan-failed":
      return "❌ scan failed";
    case "skipped":
      return "⏭️ skipped";
    case "ok":
      return "";
  }
}

export function renderLeaderboard(report: AggregatedReport): string {
  const ok = report.results
    .filter((r) => r.status === "ok" && typeof r.score === "number")
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const failed = report.results.filter((r) => r.status !== "ok");

  const lines: string[] = [];
  lines.push("");
  lines.push("| Rank | Project | Score | Errors | Warnings | Files | Commit |");
  lines.push("|-----:|---------|:-----:|------:|--------:|------:|:------:|");

  ok.forEach((entry, index) => {
    const score = entry.score ?? 0;
    const cells = [
      `${index + 1}`,
      formatProjectCell(entry),
      `${scoreEmoji(score)} ${scoreBar(score)} **${score}**/100`,
      String(entry.errorCount),
      String(entry.warningCount),
      String(entry.affectedFileCount),
      `\`${shortSha(entry.commitSha)}\``,
    ];
    lines.push(`| ${cells.join(" | ")} |`);
  });

  if (failed.length > 0) {
    lines.push("");
    lines.push("### Did not score");
    lines.push("");
    lines.push("| Project | Status | Error |");
    lines.push("|---------|--------|-------|");
    for (const entry of failed) {
      lines.push(
        `| ${formatProjectCell(entry)} | ${formatStatusBadge(entry.status)} | ${escapeError(entry.errorMessage)} |`,
      );
    }
  }

  lines.push("");
  const updatedAt = new Date(report.generatedAt).toISOString();
  const doctorVersion = report.doctorVersion ? `react-doctor \`${report.doctorVersion}\`` : "react-doctor";
  lines.push(
    `<sub>Last updated <strong>${updatedAt}</strong> · ${doctorVersion} · ${ok.length} scored, ${failed.length} skipped/failed · raw results in [\`results/latest.json\`](results/latest.json)</sub>`,
  );
  lines.push("");

  return lines.join("\n");
}

function escapeError(message: string | null): string {
  if (!message) return "—";
  const oneLine = message.replace(/\s+/g, " ").trim();
  const trimmed = oneLine.length > 140 ? `${oneLine.slice(0, 140)}…` : oneLine;
  return `\`${trimmed.replace(/`/g, "\\`")}\``;
}

export function spliceLeaderboard(readme: string, block: string): string {
  const startIndex = readme.indexOf(LEADERBOARD_START_MARKER);
  const endIndex = readme.indexOf(LEADERBOARD_END_MARKER);
  if (startIndex < 0 || endIndex < 0 || endIndex < startIndex) {
    throw new Error(
      `README.md is missing the leaderboard markers ${LEADERBOARD_START_MARKER} and ${LEADERBOARD_END_MARKER}.`,
    );
  }
  const before = readme.slice(0, startIndex + LEADERBOARD_START_MARKER.length);
  const after = readme.slice(endIndex);
  return `${before}\n${block}\n${after}`;
}
