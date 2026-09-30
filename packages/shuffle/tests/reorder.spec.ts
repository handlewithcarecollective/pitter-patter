import { expect, test, type Page } from "@playwright/test";

import {
  blocks,
  dragBlockAbove,
  dragBlockBelow,
  dragBlockBy,
  dragBlockToPoint,
  findBlock,
  moveCloneTo,
  openEditor,
  startDragOnHandle,
  tree,
  type BlockSpec,
  type HarnessBlock,
} from "./helpers.ts";
import { h, img, p } from "./nodes.ts";

/**
 * Reordering: grab a block's drag handle, move it next to another block, let go.
 *
 * Everything happens live - the document is rewritten while the clone is still in the air - so the
 * tests below assert the order of the document, not the position of a placeholder.
 */

const six = () => [h("Header"), p("P1"), p("P2"), p("P3"), p("P4"), p("P5")];

const T = (text: string): BlockSpec => ({ type: "paragraph", text });
const H = (text: string): BlockSpec => ({ type: "heading", text });

const names = (list: string[]) => list.map((name) => `"${name}" 4-9`);

test("moves a block below one further down", async ({ page }) => {
  await openEditor(page, six());
  await dragBlockBelow(page, T("P2"), T("P4"));

  expect(await tree(page)).toEqual(names(["Header", "P1", "P3", "P4", "P2", "P5"]));
});

test("moves a block above one further up", async ({ page }) => {
  await openEditor(page, six());
  await dragBlockAbove(page, T("P4"), T("P2"));

  expect(await tree(page)).toEqual(names(["Header", "P1", "P4", "P2", "P3", "P5"]));
});

test("moves a block to the end of the document", async ({ page }) => {
  await openEditor(page, six());
  await dragBlockBelow(page, T("P1"), T("P5"));

  expect(await tree(page)).toEqual(names(["Header", "P2", "P3", "P4", "P5", "P1"]));
});

test("drops into the space between two blocks", async ({ page }) => {
  await openEditor(page, six());
  const p3 = await findBlock(page, T("P3"));
  await dragBlockToPoint(page, T("P1"), { x: p3.left + p3.width / 2, y: p3.bottom + 8 });

  expect(await tree(page)).toEqual(names(["Header", "P2", "P3", "P1", "P4", "P5"]));
});

test("a block dropped in empty space below the text goes to the end", async ({ page }) => {
  await openEditor(page, six());
  await dragBlockToPoint(page, T("P1"), { x: 512, y: 620 });

  expect(await tree(page)).toEqual(names(["Header", "P2", "P3", "P4", "P5", "P1"]));
});

test("a block slid straight down keeps the columns it spans", async ({ page }) => {
  await openEditor(page, [
    h("Header"),
    p("Wide", { shuffleStart: 2, shuffleEnd: 7 }),
    p("Next"),
    p("Tail"),
  ]);

  const from = await findBlock(page, T("Wide"));
  const to = await findBlock(page, T("Next"));
  await dragBlockBy(page, T("Wide"), 0, to.bottom - 3 - (from.top + from.height / 2));

  expect(await tree(page)).toEqual(['"Header" 4-9', '"Next" 4-9', '"Wide" 2-7', '"Tail" 4-9']);
});

test("a block dropped on the middle of another block takes its columns", async ({ page }) => {
  await openEditor(page, [
    h("Header"),
    p("Wide", { shuffleStart: 2, shuffleEnd: 7 }),
    p("Next"),
    p("Tail"),
  ]);
  await dragBlockBelow(page, T("Wide"), T("Next"));

  // Columns come from the clone's left edge, and the clone was centred on the block it was dropped
  // on - so the block keeps its width but lands in the drop target's columns.
  expect(await tree(page)).toEqual(names(["Header", "Next", "Wide", "Tail"]));
});

test("drags an image, which has no text and no children", async ({ page }) => {
  await openEditor(page, [h("Header"), img(), p("Body"), p("Tail")]);
  await dragBlockBelow(page, { type: "image" }, T("Tail"));

  expect(await tree(page)).toEqual(['"Header" 4-9', '"Body" 4-9', '"Tail" 4-9', "image 4-9"]);
});

test("a drag that goes nowhere leaves the document alone", async ({ page }) => {
  await openEditor(page, six());
  await dragBlockBy(page, T("P3"), 0, 0);

  expect(await tree(page)).toEqual(names(["Header", "P1", "P2", "P3", "P4", "P5"]));
});

test("reorders as the pointer moves, without releasing", async ({ page }) => {
  await openEditor(page, six());
  const session = await startDragOnHandle(page, T("P4"));

  const p2 = await findBlock(page, T("P2"));
  await moveCloneTo(page, session, { x: p2.left + p2.width / 2, y: p2.bottom - 3 });
  const afterFirstDrop = await tree(page);

  const p1 = await findBlock(page, T("P1"));
  await moveCloneTo(page, session, { x: p1.left + p1.width / 2, y: p1.bottom - 3 });
  const afterSecondDrop = await tree(page);

  expect(afterFirstDrop).toEqual(names(["Header", "P1", "P2", "P4", "P3", "P5"]));
  expect(afterSecondDrop).toEqual(names(["Header", "P1", "P4", "P2", "P3", "P5"]));
});

test("brings the block being dragged to the front", async ({ page }) => {
  await openEditor(page, six());
  const before = await topLevelBlocks(page);
  expect(before.map((block) => block.zIndex)).toEqual([0, 0, 0, 0, 0, 0]);

  await dragBlockBelow(page, T("P2"), T("P4"));

  const after = await topLevelBlocks(page);
  expect(after.find((block) => block.text === "P2")?.zIndex).toBe(2);
  expect(after.filter((block) => block.text !== "P2").map((block) => block.zIndex)).toEqual([
    0, 0, 0, 0, 0,
  ]);
});

test("dragging the first block in the document below its neighbour", async ({ page }) => {
  await openEditor(page, [p("First"), p("Second"), p("Third"), p("Fourth")]);
  await dragBlockBelow(page, T("First"), T("Second"));

  expect(await tree(page)).toEqual(names(["Second", "First", "Third", "Fourth"]));
});

test("dragging a block above the first block in the document", async ({ page }) => {
  await openEditor(page, six());
  await dragBlockAbove(page, T("P5"), H("Header"));

  expect(await tree(page)).toEqual(names(["P5", "Header", "P1", "P2", "P3", "P4"]));
});

test("dragging the first block to the end works", async ({ page }) => {
  await openEditor(page, [p("First"), p("Second"), p("Third"), p("Fourth")]);
  await dragBlockBelow(page, T("First"), T("Fourth"));

  expect(await tree(page)).toEqual(names(["Second", "Third", "Fourth", "First"]));
});

const topLevelBlocks = async (page: Page): Promise<HarnessBlock[]> =>
  (await blocks(page)).filter((block) => block.depth === 1);
