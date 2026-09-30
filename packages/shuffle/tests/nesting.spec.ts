import { expect, test } from "@playwright/test";

import {
  dragBlockBelow,
  dragBlockBy,
  dragBlockToPoint,
  findBlock,
  openEditor,
  tree,
  type BlockSpec,
} from "./helpers.ts";
import { container, h, p, rowWith } from "./nodes.ts";

/**
 * Nesting: rows and containers are blocks that hold other blocks. A row lays its children side by
 * side and disappears when it is down to one child; a container keeps its children stacked and
 * stays put even when they leave.
 */

const T = (text: string): BlockSpec => ({ type: "paragraph", text });

const twoChildRow = () => [
  h("Header"),
  rowWith(
    { shuffleStart: 0, shuffleEnd: 13 },
    p("L", { shuffleStart: 1, shuffleEnd: 5 }),
    p("R", { shuffleStart: 7, shuffleEnd: 11 }),
  ),
  p("Mid"),
  p("Tail"),
  p("Last"),
];

test("a row moves as a whole", async ({ page }) => {
  await openEditor(page, twoChildRow());
  await dragBlockBelow(page, { type: "row" }, T("Mid"));

  expect(await tree(page)).toEqual([
    '"Header" 4-9',
    '"Mid" 4-9',
    "row",
    '  "L" 1-5',
    '  "R" 7-11',
    '"Tail" 4-9',
    '"Last" 4-9',
  ]);
});

test("a row can be moved to the end of the document", async ({ page }) => {
  await openEditor(page, twoChildRow());
  await dragBlockBelow(page, { type: "row" }, T("Last"));

  expect(await tree(page)).toEqual([
    '"Header" 4-9',
    '"Mid" 4-9',
    '"Tail" 4-9',
    '"Last" 4-9',
    "row",
    '  "L" 1-5',
    '  "R" 7-11',
  ]);
});

test("taking a child out of a row leaves the other one on its own", async ({ page }) => {
  await openEditor(page, twoChildRow());
  await dragBlockBelow(page, T("R"), T("Mid"));

  // A row with one child is unwrapped, so L is a top level block again - at the columns it had.
  expect(await tree(page)).toEqual([
    '"Header" 4-9',
    '"L" 1-5',
    '"Mid" 4-9',
    '"R" 4-8',
    '"Tail" 4-9',
    '"Last" 4-9',
  ]);
});

test("taking the first child out of a row leaves the other one on its own", async ({ page }) => {
  await openEditor(page, twoChildRow());
  await dragBlockBelow(page, T("L"), T("Last"));

  expect(await tree(page)).toEqual([
    '"Header" 4-9',
    '"R" 7-11',
    '"Mid" 4-9',
    '"Tail" 4-9',
    '"Last" 4-9',
    '"L" 4-8',
  ]);
});

test("a container moves as a whole, children and all", async ({ page }) => {
  await openEditor(page, [h("Header"), container(p("A"), p("B")), p("Tail"), p("Last")]);
  await dragBlockBelow(page, { type: "container" }, T("Tail"));

  expect(await tree(page)).toEqual([
    '"Header" 4-9',
    '"Tail" 4-9',
    "container 4-9",
    '  "A" 4-9',
    '  "B" 4-9',
    '"Last" 4-9',
  ]);
});

test("a block taken out of a container leaves the container behind", async ({ page }) => {
  await openEditor(page, [h("Header"), container(p("A"), p("B")), p("Tail")]);
  await dragBlockBelow(page, T("B"), T("Tail"));

  expect(await tree(page)).toEqual([
    '"Header" 4-9',
    "container 4-9",
    '  "A" 4-9',
    '"Tail" 4-9',
    '"B" 4-9',
  ]);
});

test("a block dropped on a container's bottom edge goes inside it", async ({ page }) => {
  await openEditor(page, [h("Header"), container(p("A"), p("B")), p("Loose"), p("Tail")]);
  const box = await findBlock(page, { type: "container" });
  await dragBlockToPoint(page, T("Loose"), { x: box.left + box.width / 2, y: box.bottom - 3 });

  const lines = await tree(page);
  const containerIndex = lines.indexOf("container 4-9");
  expect(lines.slice(containerIndex, containerIndex + 4)).toEqual([
    "container 4-9",
    '  "A" 4-9',
    '  "B" 4-9',
    '  "Loose" 4-9',
  ]);
  expect(lines.filter((line) => !line.startsWith("  "))).toEqual([
    '"Header" 4-9',
    "container 4-9",
    '"Tail" 4-9',
  ]);
});

test("dragging the only child out of a row leaves nothing behind", async ({ page }) => {
  await openEditor(page, [
    h("Header"),
    rowWith({ shuffleStart: 0, shuffleEnd: 13 }, p("Solo", { shuffleStart: 1, shuffleEnd: 5 })),
    p("Mid"),
    p("Tail"),
  ]);
  await dragBlockBy(page, T("Solo"), 0, 120);

  expect(await tree(page)).toEqual(['"Header" 4-9', '"Mid" 4-9', '"Tail" 4-9', '"Solo" 1-5']);
});

test("dragging the only child out of a container does not leave a paragraph behind", async ({
  page,
}) => {
  // A container's content is `block+`, so emptying it is not something the transform can do
  // directly: ProseMirror fills the hole with a new empty paragraph, which is visible to the user
  // as a block they never typed. Either the container goes with its last child, or it is allowed
  // to be empty.
  await openEditor(page, [h("Header"), container(p("Only")), p("Tail")]);
  await dragBlockBelow(page, T("Only"), T("Tail"));

  expect(await tree(page)).toEqual(['"Header" 4-9', '"Tail" 4-9', '"Only" 4-9']);
});
