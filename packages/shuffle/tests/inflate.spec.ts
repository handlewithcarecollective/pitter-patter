import { expect, test } from "@playwright/test";

import { dragInflatableTo, inflatable, openEditor, tree } from "./helpers.ts";
import { h, p } from "./nodes.ts";

/**
 * Inflatables: the menu holds a chip for each node the editor offers; dragging a chip into the
 * document inserts that node where the chip is dropped.
 */

const twoBlocks = () => [h("Header"), p("Tail")];

test("the menu offers a chip per node type", async ({ page }) => {
  await openEditor(page, twoBlocks());

  expect(await page.locator(".inflatable-menu .inflatable").allTextContents()).toEqual([
    "Paragraph",
    "Image",
    "Card deck",
  ]);
});

test("drops a paragraph at the bottom of the document", async ({ page }) => {
  await openEditor(page, twoBlocks());
  await dragInflatableTo(page, "Paragraph", { x: 512, y: 300 });

  const lines = await tree(page);
  expect(lines.length).toBe(3);
  expect(lines[0]).toBe('"Header" 4-9');
  expect(lines[1]).toBe('"Tail" 4-9');
  expect(lines[2]).toMatch(/^"A brand new paragraph\." \d+-\d+$/);
});

test("drops a paragraph above everything else", async ({ page }) => {
  await openEditor(page, twoBlocks());
  await dragInflatableTo(page, "Paragraph", { x: 512, y: 100 });

  const lines = await tree(page);
  expect(lines[0]).toMatch(/^"A brand new paragraph\." \d+-\d+$/);
  expect(lines.slice(1)).toEqual(['"Header" 4-9', '"Tail" 4-9']);
});

test("the columns of the inserted node follow the chip", async ({ page }) => {
  await openEditor(page, twoBlocks());
  await dragInflatableTo(page, "Paragraph", { x: 512, y: 300 }, 4);

  // The chip's clone is the size of the chip, and it is the clone's left edge that decides where
  // the new node starts. The node then spans six columns from there.
  expect(await tree(page)).toEqual(['"Header" 4-9', '"Tail" 4-9', '"A brand new paragraph." 4-9']);
});

test("a chip aimed at the far left column is dropped at the top of the document", async ({
  page,
}) => {
  await openEditor(page, twoBlocks());
  await dragInflatableTo(page, "Paragraph", { x: 512, y: 300 }, 1);

  // Sliding the chip to column 1 takes the centre of its clone out of the text altogether, and a
  // drop outside every block resolves to the start of the document.
  expect(await tree(page)).toEqual(['"A brand new paragraph." 1-6', '"Header" 4-9', '"Tail" 4-9']);
});

test("the span follows the chip when it is aimed at another column", async ({ page }) => {
  await openEditor(page, twoBlocks());
  await dragInflatableTo(page, "Paragraph", { x: 512, y: 300 }, 6);

  expect(await tree(page)).toEqual(['"Header" 4-9', '"Tail" 4-9', '"A brand new paragraph." 6-11']);
});

test("drops an image", async ({ page }) => {
  await openEditor(page, twoBlocks());
  await dragInflatableTo(page, "Image", { x: 512, y: 250 });

  const lines = await tree(page);
  expect(lines.filter((line) => line.startsWith("image"))).toHaveLength(1);
  expect(lines).toEqual(['"Header" 4-9', expect.stringMatching(/^image \d+-\d+$/), '"Tail" 4-9']);
});

test("drops a whole card deck", async ({ page }) => {
  await openEditor(page, twoBlocks());
  await dragInflatableTo(page, "Card deck", { x: 512, y: 250 });

  const lines = await tree(page);
  expect(lines).toEqual([
    '"Header" 4-9',
    expect.stringMatching(/^card_deck \d+-\d+$/),
    '  "Deck card one."',
    '    "Deck card one." 4-9',
    '  "Deck card two."',
    '    "Deck card two." 4-9',
    '"Tail" 4-9',
  ]);
});

test("dragging a chip does not take it out of the menu", async ({ page }) => {
  await openEditor(page, twoBlocks());
  await dragInflatableTo(page, "Paragraph", { x: 512, y: 300 });

  await expect(inflatable(page, "Paragraph")).toBeVisible();
  expect(await page.locator(".inflatable-menu .inflatable").count()).toBe(3);
  expect(await tree(page)).toHaveLength(3);
});
