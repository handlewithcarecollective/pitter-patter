import { execSync } from "node:child_process";
import { join } from "node:path";

import { getPluginConfiguration } from "@yarnpkg/cli";
import { Project, Configuration, type Workspace } from "@yarnpkg/core";
import { npath } from "@yarnpkg/fslib";
import * as pluginVersion from "@yarnpkg/plugin-version";

const startingCwd = npath.toPortablePath(process.cwd());

const configuration = await Configuration.find(startingCwd, getPluginConfiguration());
const { project } = await Project.find(configuration, startingCwd);

const versionFile = await pluginVersion.versionUtils.openVersionFile(project, { allowEmpty: true });

const unreleasedWorkspaces: Workspace[] = [];

for (const workspace of versionFile.changedWorkspaces) {
  if (!workspace.manifest.version) continue;
  if (versionFile?.releases.has(workspace)) continue;
  const diff = execSync(`git diff origin/main -- ${join(workspace.relativeCwd, "package.json")}`, {
    encoding: "utf-8",
  });
  const hasBeenUpgraded = !!diff.match(/^\+\s*"version":/gm);
  if (!hasBeenUpgraded) unreleasedWorkspaces.push(workspace);
}

if (unreleasedWorkspaces.length) {
  console.error(`The following workspaces have been changed, but have no release strategy:

${unreleasedWorkspaces.map((w) => `@${w.manifest.name?.scope}/${w.manifest.name?.name}`).join("\n")}`);
  process.exit(1);
}

console.log("All changed workspaces have either release strategy or version bump");
process.exit(0);
