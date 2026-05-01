// Generates release notes for a single package in a Yarn monorepo by walking
// merge commits in the release range and checking .yarn/versions/ declarations.

import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const {
  PACKAGE,
  CURRENT_TAG,
  PREV_TAG = "",
  REPO,
  GH_TOKEN,
  OUTPUT_FILE = "release_notes.md",
} = process.env;

if (!PACKAGE || !CURRENT_TAG || !REPO || !GH_TOKEN) {
  console.error("Missing required env vars: PACKAGE, CURRENT_TAG, REPO, GH_TOKEN");
  process.exit(1);
}

function git(args: string) {
  return execSync(`git ${args}`, { encoding: "utf8" }).trim();
}

function ghApi(path: string) {
  return JSON.parse(execSync(`gh api "${path.replaceAll('"', '\\"')}"`, { encoding: "utf8" }));
}

/**
 * Minimal parser for Yarn's deferred version files:
 *
 *   releases:
 *     my-package: minor
 *     other-package: patch
 */
function isPackageInVersionFile(yamlContent: string, packageName: string) {
  let inReleases = false;
  for (const raw of yamlContent.split("\n")) {
    const line = raw.trimEnd();
    if (/^releases\s*:/.test(line)) {
      inReleases = true;
      continue;
    }
    if (inReleases) {
      if (/^\s+\S/.test(line)) {
        const key = line.trim().split(":")[0].trim();
        if (key === `"@pitter-patter/${packageName}"`) return true;
      } else if (/^\S/.test(line)) {
        break;
      }
    }
  }
  return false;
}

function extractPRNumber(subject: string) {
  const squash = subject.match(/\(#(\d+)\)\s*$/);
  return squash?.[1] ?? null;
}

const range = PREV_TAG ? `${PREV_TAG}..${CURRENT_TAG}` : CURRENT_TAG;
const raw = git(`log ${range} --format="%H"`);
const mergeCommits = raw ? raw.split("\n") : [];

console.log(`Scanning ${mergeCommits.length} merge commit(s) in ${range}`);

const prNumbers: number[] = [];

for (const sha of mergeCommits) {
  const changedFiles = git(`diff-tree --no-commit-id -r --name-only --diff-filter=A ${sha}`).split(
    "\n",
  );
  const versionFiles = changedFiles.filter((f) => /^\.yarn\/versions\/.*\.ya?ml$/.test(f));

  if (versionFiles.length === 0) continue;

  let affectsPackage = false;
  for (const file of versionFiles) {
    try {
      const content = git(`show ${sha}:${file}`);
      if (isPackageInVersionFile(content, PACKAGE)) {
        affectsPackage = true;
        break;
      }
    } catch {}
  }

  if (!affectsPackage) continue;

  const subject = git(`log -1 --format="%s" ${sha}`);
  const number = extractPRNumber(subject);

  if (number) {
    prNumbers.push(parseInt(number, 10));
    console.log(`  ✓ PR #${number} (${sha.slice(0, 7)}) affects ${PACKAGE}`);
  } else {
    console.warn(`  ⚠ Could not extract PR number from: "${subject}"`);
  }
}

const prs = await Promise.all(prNumbers.map((n) => ghApi(`/repos/${REPO}/pulls/${n}`)));

const lines = ["## What's Changed", ""];

if (prs.length > 0) {
  for (const pr of prs) {
    lines.push(`* ${pr.title} ([#${pr.number}](${pr.html_url})) by @${pr.user.login}`);
  }
} else {
  lines.push(`_No changes declared for \`@pitter-patter/${PACKAGE}\` since the previous release._`);
}

lines.push("");

if (PREV_TAG) {
  lines.push(`**Full diff**: https://github.com/${REPO}/compare/${PREV_TAG}...${CURRENT_TAG}`);
}

const notes = lines.join("\n");
writeFileSync(OUTPUT_FILE, notes);
console.log(`\nWrote ${OUTPUT_FILE}:\n${notes}`);
