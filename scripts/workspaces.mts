import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

export type Workspace = {
  name: string;
  /** Workspace path relative to the project root, with forward slashes. */
  dir: string;
  version: string | null;
  private: boolean;
};

export function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

export const projectRoot = resolve(git(["rev-parse", "--show-toplevel"]));

const packagesDir = join(projectRoot, "packages");

export function listWorkspaces(): Workspace[] {
  const workspaces: Workspace[] = [];

  for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const dir = join(packagesDir, entry.name);
    const manifestPath = join(dir, "package.json");
    if (!existsSync(manifestPath)) continue;

    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      name?: string;
      version?: string;
      private?: boolean;
    };
    if (!manifest.name) continue;

    workspaces.push({
      name: manifest.name,
      dir: relative(projectRoot, dir).split(/[\\/]/).join("/"),
      version: manifest.version ?? null,
      private: manifest.private === true,
    });
  }

  return workspaces;
}
