import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { git, listWorkspaces } from "./workspaces.mts";

for (const workspace of listWorkspaces()) {
  if (workspace.version === null) continue;

  const diff = git(["diff", "HEAD^", "--", join(workspace.dir, "package.json")]);
  const hasBeenUpgraded = /^\+\s*"version":/gm.test(diff);
  if (!hasBeenUpgraded) continue;

  const shortName = workspace.name.startsWith("@")
    ? workspace.name.split("/").pop()!
    : workspace.name;
  const tagName = `${shortName}-v${workspace.version}`;

  execFileSync("git", ["tag", tagName]);
  execFileSync("git", ["push", "origin", "tag", tagName]);
  execFileSync("gh", ["workflow", "run", "release", "--ref", tagName]);
}
