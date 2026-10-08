// Generates release notes for a single package in this pnpm workspace by walking
// merge commits in the release range and checking .changeset/ change intents.

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

const INTENT_FILE = /^\.changeset\/[^/]+\.md$/;

/**
 * Whether a change intent asks for a release of the package. Intents are markdown
 * with a semver frontmatter:
 *
 *   ---
 *   "@pitter-patter/shuffle": minor
 *   "@pitter-patter/refs": none
 *   ---
 *
 *   Summary that becomes the changelog entry.
 *
 * A `none` bump is an explicit decline, so it does not count.
 */
function isPackageReleasedByIntent(intentContent: string, packageName: string) {
  const lines = intentContent.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return false;

  for (const raw of lines.slice(1)) {
    const line = raw.trim();
    if (line === "---") break;

    const colon = line.indexOf(":");
    if (colon === -1) continue;

    const ident = line
      .slice(0, colon)
      .trim()
      .replace(/^["']|["']$/g, "");
    const bump = line
      .slice(colon + 1)
      .trim()
      .replace(/^["']|["']$/g, "");

    if (ident === `@pitter-patter/${packageName}` && bump !== "none") return true;
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
  const intentFiles = changedFiles.filter(
    (f) => INTENT_FILE.test(f) && f !== ".changeset/README.md",
  );

  if (intentFiles.length === 0) continue;

  let affectsPackage = false;
  for (const file of intentFiles) {
    try {
      const content = git(`show ${sha}:${file}`);
      if (isPackageReleasedByIntent(content, PACKAGE)) {
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
