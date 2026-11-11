import { expect, test } from "@playwright/test";

import {
  dragBlockBeside,
  dragBlockOnto,
  dragBlockToPoint,
  findBlock,
  openEditor,
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

test("dropping a block beside another block groups them", async ({ page }) => {
  await openEditor(page, [
    h("Header"),
    p("Loose"),
    p("Half", { shuffleStart: 1, shuffleEnd: 5 }),
    p("Tail"),
    p("Last"),
  ]);
  await dragBlockBeside(page, T("Loose"), T("Half"));

  expect(await tree(page)).toEqual([
    '"Header" 4-9',
    "row",
    '  "Loose" 5-10',
    '  "Half" 1-5',
    '"Tail" 4-9',
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
    "row",
    '  "Loose" 7-12',
    '  "Right" 8-12',
    '"Tail" 4-9',
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
    '  "L" 1-5',
    '  "Mid" 4-9',
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

// It's currently weirdly tricky to move a node into a container, need
// to improve
test.fail("a block dropped on the middle of a container lands after it", async ({ page }) => {
  await openEditor(page, [h("Header"), p("Loose"), container(p("In"), p("Other")), p("Tail")]);
  await dragBlockOnto(page, T("Loose"), { type: "container" });

  expect(await tree(page)).toEqual([
    '"Header" 4-9',
    "container 4-9",
    '  "In" 4-9',
    '  "Loose" 4-9',
    '  "Other" 4-9',
    '"Tail" 4-9',
  ]);
});
