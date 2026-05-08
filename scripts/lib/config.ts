/**
 * Loader + zod schema for repos.yaml.
 *
 * Centralises repo-config validation so every script (benchmark-repo, matrix,
 * aggregate, render-readme) sees the same canonical shape.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { load as loadYaml } from "js-yaml";
import { z } from "zod";

export const PackageManagerSchema = z.enum(["pnpm", "npm", "yarn", "bun"]);
export type PackageManager = z.infer<typeof PackageManagerSchema>;

export const RepoConfigSchema = z
  .object({
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9][a-z0-9-]*$/, "slug must be kebab-case [a-z0-9-]"),
    name: z.string().min(1),
    githubUrl: z
      .string()
      .url()
      .regex(/^https:\/\/github\.com\/[^/]+\/[^/]+$/i, "githubUrl must be https://github.com/<owner>/<repo>"),
    ref: z.string().min(1).default("HEAD"),
    scanDir: z.string().min(1).default("."),
    project: z.string().min(1).optional(),
    packageManager: PackageManagerSchema.optional(),
    installArgs: z.array(z.string()).default([]),
    skipDeadCode: z.boolean().default(false),
    skipInstall: z.boolean().default(false),
    notes: z.string().optional(),
  })
  .strict();

export type RepoConfig = z.infer<typeof RepoConfigSchema>;

const FileSchema = z
  .object({
    repos: z.array(RepoConfigSchema).min(1),
  })
  .strict();

const REPOS_FILE = "repos.yaml";

export function loadRepos(rootDir: string = process.cwd()): RepoConfig[] {
  const path = resolve(rootDir, REPOS_FILE);
  const raw = readFileSync(path, "utf8");
  const parsed = loadYaml(raw);
  const validated = FileSchema.parse(parsed);

  // Enforce slug uniqueness — easy to break by hand-editing repos.yaml.
  const seen = new Set<string>();
  for (const repo of validated.repos) {
    if (seen.has(repo.slug)) {
      throw new Error(`Duplicate slug in ${REPOS_FILE}: ${repo.slug}`);
    }
    seen.add(repo.slug);
  }

  return validated.repos;
}

export function findRepoBySlug(repos: RepoConfig[], slug: string): RepoConfig | undefined {
  return repos.find((r) => r.slug === slug);
}
