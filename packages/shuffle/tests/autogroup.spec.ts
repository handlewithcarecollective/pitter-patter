import { expect, test } from "@playwright/test";

import {
  dragBlockBeside,
  dragBlockOnto,
  dragBlockToPoint,
  endDrag,
  findBlock,
  openEditor,
  placeCloneAt,
  startDragOnHandle,
  tree,
  type BlockSpec,
} from "./helpers.ts";
import { container, h, p, rowWith } from "./nodes.ts";

/**
 * Auto-grouping: blocks that end up beside each other, or on top of each other, are wrapped in a
 * `row`, which is what lays them out side by side.
 *
 * Two paths create a row: dropping a block on another block's vertical centre, and dropping it at
 * another block's height but in the columns that block leaves free.
 */

const T = (text: string): BlockSpec => ({ type: "paragraph", text });

const six = () => [h("Header"), p("P1"), p("P2"), p("P3"), p("P4"), p("P5")];

test("dropping a block up onto another block groups the two", async ({ page }) => {
  await openEditor(page, six());
  await dragBlockOnto(page, T("P4"), T("P3"));

  expect(await tree(page)).toEqual([
    '"Header" 4-9',
    '"P1" 4-9',
    '"P2" 4-9',
    "row",
    '  "P4" 4-9',
    '  "P3" 4-9',
    '"P5" 4-9',
  ]);
});

test("the dragged block comes first in the new row", async ({ page }) => {
  await openEditor(page, six());
  await dragBlockOnto(page, T("P5"), T("P4"));

  const lines = await tree(page);
  expect(lines.slice(lines.indexOf("row"))).toEqual(["row", '  "P5" 4-9', '  "P4" 4-9']);
});

test("dropping a block beside another block groups them", async ({ page }) => {
  await openEditor(page, [
    h("Header"),
    p("Loose"),
    p("Half", { shuffleStart: 1, shuffleEnd: 5 }),
    p("Tail"),
    p("Last"),
  ]);
  await dragBlockBeside(page, T("Loose"), T("Half"));

  // The dragged block is given the columns its clone was dropped over, and joins the row with the
  // block it was dropped next to, which keeps the columns it already had.
  expect(await tree(page)).toEqual([
    '"Header" 4-9',
    '"Half" 1-5',
    "row",
    '  "Loose" 3-8',
    '  "Tail" 4-9',
    '"Last" 4-9',
  ]);
});

test("a block dropped in the spare columns of a right aligned block groups with it", async ({
  page,
}) => {
  await openEditor(page, [
    h("Header"),
    p("Loose"),
    p("Right", { shuffleStart: 8, shuffleEnd: 12 }),
    p("Tail"),
    p("Last"),
  ]);
  await dragBlockBeside(page, T("Loose"), T("Right"));

  expect(await tree(page)).toEqual([
    '"Header" 4-9',
    '"Right" 8-12',
    "row",
    '  "Loose" 5-10',
    '  "Tail" 4-9',
    '"Last" 4-9',
  ]);
});

test("a third block can join a row that has room", async ({ page }) => {
  await openEditor(page, [
    h("Header"),
    rowWith(
      { shuffleStart: 0, shuffleEnd: 13 },
      p("L", { shuffleStart: 1, shuffleEnd: 4 }),
      p("R", { shuffleStart: 5, shuffleEnd: 8 }),
    ),
    p("Loose"),
    p("Tail"),
  ]);
  const row = await findBlock(page, { type: "row" });
  await dragBlockToPoint(page, T("Loose"), { x: row.right - 30, y: row.top + row.height / 2 });

  const children = (await tree(page)).filter((line) => line.startsWith("  "));
  expect(children).toEqual(['  "L" 1-4', '  "R" 5-8', '  "Loose" 4-9']);
});

test("a block dropped on a block that is already in a row joins that row", async ({ page }) => {
  await openEditor(page, [
    h("Header"),
    rowWith(
      { shuffleStart: 0, shuffleEnd: 13 },
      p("L", { shuffleStart: 1, shuffleEnd: 5 }),
      p("R", { shuffleStart: 7, shuffleEnd: 11 }),
    ),
    p("Mid"),
    p("Tail"),
    p("Last"),
  ]);
  await dragBlockOnto(page, T("Mid"), T("L"));

  // Rows never nest: Mid is added to the existing row rather than wrapped in a new one.
  expect(await tree(page)).toEqual([
    '"Header" 4-9',
    "row",
    '  "Mid" 1-6',
    '  "L" 1-5',
    '  "R" 7-11',
    '"Tail" 4-9',
    '"Last" 4-9',
  ]);
});

test("a row dropped on a block stays a row of its own", async ({ page }) => {
  await openEditor(page, [
    rowWith(
      { shuffleStart: 0, shuffleEnd: 13 },
      p("L", { shuffleStart: 1, shuffleEnd: 5 }),
      p("R", { shuffleStart: 7, shuffleEnd: 11 }),
    ),
    p("Mid"),
    p("Tail"),
  ]);
  await dragBlockOnto(page, { type: "row" }, T("Mid"));

  expect(await tree(page)).toEqual(['"Mid" 4-9', "row", '  "L" 1-5', '  "R" 7-11', '"Tail" 4-9']);
});

test("a block dropped on the middle of a container lands after it", async ({ page }) => {
  await openEditor(page, [h("Header"), p("Loose"), container(p("In"), p("Other")), p("Tail")]);
  await dragBlockOnto(page, T("Loose"), { type: "container" });

  expect(await tree(page)).toEqual([
    '"Header" 4-9',
    "container 4-9",
    '  "In" 4-9',
    '  "Other" 4-9',
    '"Loose" 4-9',
    '"Tail" 4-9',
  ]);
});

test("dropping a block down onto the block below it groups the two", async ({ page }) => {
  await openEditor(page, six());
  const target = await findBlock(page, T("P3"));
  const session = await startDragOnHandle(page, T("P2"));
  await placeCloneAt(page, session, {
    x: target.left + target.width / 2,
    y: target.top + target.height / 2,
  });
  await endDrag(page);

  expect(await tree(page)).toEqual([
    '"Header" 4-9',
    '"P1" 4-9',
    "row",
    '  "P2" 4-9',
    '  "P3" 4-9',
    '"P4" 4-9',
    '"P5" 4-9',
  ]);
});

test.fail(
  "a block held over the block below another groups with the wrong neighbour (if there's no scroll margin)",
  async ({ page }) => {
    await openEditor(page, six());
    await dragBlockOnto(page, T("P2"), T("P3"));

    expect(await tree(page)).toEqual([
      '"Header" 4-9',
      '"P1" 4-9',
      "row",
      '  "P2" 4-9',
      '  "P3" 4-9',
      '"P4" 4-9',
      '"P5" 4-9',
    ]);
  },
);
