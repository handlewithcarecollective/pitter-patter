import { expect, test } from "@playwright/test";

import {
  dragBlockBy,
  dragBlockToColumn,
  findBlock,
  openEditor,
  tree,
  type BlockSpec,
} from "./helpers.ts";
import { h, img, p, rowWith } from "./nodes.ts";

/**
 * Repositioning: drag a block sideways and it re-snaps to the 12 column grid.
 *
 * The column is chosen by the clone's left edge, so a block slides to whichever grid line the clone
 * is put over, and keeps the width it already had.
 */

const T = (text: string): BlockSpec => ({ type: "paragraph", text });

const wide = () => [h("Header"), p("Wide", { shuffleStart: 3, shuffleEnd: 8 }), p("Tail")];

test("snaps to a grid column", async ({ page }) => {
  await openEditor(page, wide());
  await dragBlockToColumn(page, T("Wide"), 6);

  expect(await tree(page)).toEqual(['"Header" 4-9', '"Wide" 6-11', '"Tail" 4-9']);
});

test("snaps to the first column", async ({ page }) => {
  await openEditor(page, wide());
  await dragBlockToColumn(page, T("Wide"), 1);

  expect(await tree(page)).toEqual(['"Header" 4-9', '"Wide" 1-6', '"Tail" 4-9']);
});

test("stays put when dropped on its own column", async ({ page }) => {
  await openEditor(page, wide());
  await dragBlockToColumn(page, T("Wide"), 3);

  expect(await tree(page)).toEqual(['"Header" 4-9', '"Wide" 3-8', '"Tail" 4-9']);
});

test("a nudge of one column is enough", async ({ page }) => {
  await openEditor(page, wide());
  await dragBlockBy(page, T("Wide"), 40, 0);

  expect(await tree(page)).toEqual(['"Header" 4-9', '"Wide" 4-9', '"Tail" 4-9']);
});

test("will not push a block past the right hand edge", async ({ page }) => {
  await openEditor(page, wide());
  await dragBlockToColumn(page, T("Wide"), 12);

  // Six columns wide starting at 12 would run off the grid, so the move is refused outright.
  expect(await tree(page)).toEqual(['"Header" 4-9', '"Wide" 3-8', '"Tail" 4-9']);
});

test("will not slide a block any further right than the edge", async ({ page }) => {
  await openEditor(page, wide());
  await dragBlockBy(page, T("Wide"), 600, 0);

  expect(await tree(page)).toEqual(['"Header" 4-9', '"Wide" 3-8', '"Tail" 4-9']);
});

test("slides to the first column when dragged off the left hand edge", async ({ page }) => {
  await openEditor(page, wide());
  await dragBlockBy(page, T("Wide"), -600, 0);

  expect(await tree(page)).toEqual(['"Header" 4-9', '"Wide" 1-6', '"Tail" 4-9']);
});

test("keeps its width while moving", async ({ page }) => {
  await openEditor(page, [h("Header"), img({ shuffleStart: 1, shuffleEnd: 4 }), p("Tail")]);
  await dragBlockToColumn(page, { type: "image" }, 6);

  expect(await tree(page)).toEqual(['"Header" 4-9', "image 6-9", '"Tail" 4-9']);
});

test("re-orders the children of a row by the column they start at", async ({ page }) => {
  await openEditor(page, [
    h("Header"),
    rowWith(
      { shuffleStart: 0, shuffleEnd: 13 },
      p("L", { shuffleStart: 1, shuffleEnd: 5 }),
      p("R", { shuffleStart: 7, shuffleEnd: 11 }),
    ),
    p("Mid"),
    p("Tail"),
  ]);
  await dragBlockToColumn(page, T("L"), 8);

  // L moves right of R, so R comes first in the document: the order of a row's children is the
  // order they are drawn in.
  expect(await tree(page)).toEqual([
    '"Header" 4-9',
    "row",
    '  "R" 7-11',
    '  "L" 8-12',
    '"Mid" 4-9',
    '"Tail" 4-9',
  ]);
});

test("a block moved sideways in a row is not moved out of it", async ({ page }) => {
  await openEditor(page, [
    h("Header"),
    rowWith(
      { shuffleStart: 0, shuffleEnd: 13 },
      p("L", { shuffleStart: 1, shuffleEnd: 5 }),
      p("R", { shuffleStart: 7, shuffleEnd: 11 }),
    ),
    p("Tail"),
  ]);
  await dragBlockBy(page, T("R"), -120, 0);

  const moved = await findBlock(page, T("R"));
  expect({ start: moved.start, end: moved.end, depth: moved.depth }).toEqual({
    start: 5,
    end: 9,
    depth: 2,
  });
});
