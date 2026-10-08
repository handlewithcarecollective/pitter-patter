// Fails if a changed, publishable workspace has no release decision.
//
// A workspace has a decision when either:
//   - a change intent in .changeset/ names it (any bump, including `none`), or
//   - its package.json version differs from the version on the base branch.
//

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { git, listWorkspaces, projectRoot } from "./workspaces.mts";

const baseRefs = ["origin/main", "main"];

function findBase(): string | null {
  for (const ref of baseRefs) {
    try {
      return git(["merge-base", "HEAD", ref]);
    } catch {}
  }
  return null;
}

/** Package names named by the pending change intents, including explicit declines. */
function readIntentDecisions(): Set<string> {
  const changesetRoot = join(projectRoot, ".changeset");
  const decisions = new Set<string>();
  if (!existsSync(changesetRoot)) return decisions;

  for (const entry of readdirSync(changesetRoot, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md") || entry.name === "README.md") continue;

    const lines = readFileSync(join(changesetRoot, entry.name), "utf8").split(/\r?\n/);
    if (lines[0]?.trim() !== "---") continue;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]!.trim();
      if (line === "---") break;

      const colon = line.indexOf(":");
      if (colon === -1) continue;

      const ident = line
        .slice(0, colon)
        .trim()
        .replace(/^["']|["']$/g, "");
      if (ident.startsWith("./")) continue;

      decisions.add(ident);
    }
  }

  return decisions;
}

/** The version declared on the base commit, or null when the workspace did not exist yet. */
function baseVersion(base: string, dir: string): string | null {
  try {
    const manifest = git(["show", `${base}:${join(dir, "package.json")}`]);
    return (JSON.parse(manifest) as { version?: string }).version ?? null;
  } catch {
    return null;
  }
}

function main() {
  const base = findBase();
  if (base === null) {
    console.error(
      `Could not find a merge base with any of: ${baseRefs.join(", ")}\n` +
        `Fetch the base branch (checkout with fetch-depth: 0) and try again.`,
    );
    process.exit(1);
  }

  const changedFiles = git(["diff", "--name-only", base, "HEAD"]).split("\n").filter(Boolean);

  const changedWorkspaces = listWorkspaces().filter(
    (workspace) =>
      !workspace.private &&
      workspace.version !== null &&
      changedFiles.some((file) => file === workspace.dir || file.startsWith(`${workspace.dir}/`)),
  );

  if (changedWorkspaces.length === 0) {
    console.log("No publishable workspaces changed");
    return;
  }

  const decisions = readIntentDecisions();

  const statusOf = changedWorkspaces.map((workspace) => ({
    name: workspace.name,
    bumped: baseVersion(base, workspace.dir) !== workspace.version,
    declared: decisions.has(workspace.name),
  }));

  const undecided = statusOf.filter((status) => !status.bumped && !status.declared);

  if (undecided.length) {
    console.error(`The following workspaces have been changed, but have no release strategy:

${undecided.map((status) => status.name).join("\n")}

Record one with: pnpm change`);
    process.exit(1);
  }

  console.log(
    `All changed workspaces have either a release strategy or a version bump\n\n` +
      statusOf
        .map((status) => `  ${status.name}${status.bumped ? " (version bumped)" : " (declared)"}`)
        .join("\n"),
  );
}

main();
