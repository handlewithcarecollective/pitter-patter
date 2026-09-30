import { expect, test } from "@playwright/test";

import {
  dragBlockBelow,
  dragBlockOnto,
  dragBlockToPoint,
  endDrag,
  findBlock,
  moveCloneTo,
  openEditor,
  startDragOnHandle,
  tree,
  type BlockSpec,
} from "./helpers.ts";
import { card, container, deck, p } from "./nodes.ts";

/**
 * Containment: a `card` declares `containedBy: "card_deck"`, so it can only ever live inside a deck.
 * The plugin enforces that on both ends of a drag.
 */

const T = (text: string): BlockSpec => ({ type: "paragraph", text });

const deckOfCards = () => [
  p("Header"),
  deck(card("Card one"), card("Card two"), card("Card three")),
  p("Tail"),
  p("Last"),
];

test("cards can be reordered within their deck", async ({ page }) => {
  await openEditor(page, deckOfCards());
  const session = await startDragOnHandle(page, { type: "card", text: "Card one" });
  const three = await findBlock(page, { type: "card", text: "Card three" });
  await moveCloneTo(page, session, {
    x: three.left + three.width / 2,
    y: three.top + three.height / 2,
  });
  expect
    .soft(await tree(page), "reordered while the card is still in the air")
    .toEqual(cardsInOrder(["Card two", "Card three", "Card one"]));

  await endDrag(page);
  expect(await tree(page)).toEqual(cardsInOrder(["Card two", "Card three", "Card one"]));
});

test("a card dropped on the left half of another card lands before it", async ({ page }) => {
  await openEditor(page, deckOfCards());
  const one = await findBlock(page, { type: "card", text: "Card one" });
  const session = await startDragOnHandle(page, { type: "card", text: "Card three" });
  await moveCloneTo(page, session, { x: one.left + one.width * 0.25, y: one.top + one.height / 2 });
  await endDrag(page);

  expect(await tree(page)).toEqual(cardsInOrder(["Card three", "Card one", "Card two"]));
});

test("a card dropped on the middle of another card lands after it", async ({ page }) => {
  await openEditor(page, deckOfCards());
  await dragBlockOnto(
    page,
    { type: "card", text: "Card three" },
    { type: "card", text: "Card one" },
  );

  // Cards sit side by side, so the half that is measured is horizontal: dropping on the centre
  // counts as the far half.
  expect(await tree(page)).toEqual(cardsInOrder(["Card one", "Card three", "Card two"]));
});

test("a card cannot be dragged out of its deck", async ({ page }) => {
  await openEditor(page, deckOfCards());
  await dragBlockBelow(page, { type: "card", text: "Card one" }, T("Tail"));

  expect(await tree(page)).toEqual(cardsInOrder(["Card one", "Card two", "Card three"]));
});

test("a card cannot be dragged into a container", async ({ page }) => {
  await openEditor(page, [
    p("Header"),
    deck(card("Card one")),
    container(p("A"), p("B")),
    p("Tail"),
  ]);
  const box = await findBlock(page, { type: "container" });
  await dragBlockToPoint(
    page,
    { type: "card", text: "Card one" },
    { x: box.left + box.width / 2, y: box.top + box.height / 2 },
  );

  expect(await tree(page)).toEqual([
    '"Header" 4-9',
    "card_deck 4-9",
    '  "Card one"',
    '    "Card one" 4-9',
    "container 4-9",
    '  "A" 4-9',
    '  "B" 4-9',
    '"Tail" 4-9',
  ]);
});

test("the deck itself is an ordinary block", async ({ page }) => {
  await openEditor(page, deckOfCards());
  await dragBlockBelow(page, { type: "card_deck" }, T("Tail"));

  expect(await tree(page)).toEqual([
    '"Header" 4-9',
    '"Tail" 4-9',
    "card_deck 4-9",
    '  "Card one"',
    '    "Card one" 4-9',
    '  "Card two"',
    '    "Card two" 4-9',
    '  "Card three"',
    '    "Card three" 4-9',
    '"Last" 4-9',
  ]);
});

/**
 * The tree of a deck, reduced to the order of its cards. Cards render their heading and their body,
 * so every card is two lines in `tree()`.
 */
function cardsInOrder(order: string[]): string[] {
  const lines = ['"Header" 4-9', "card_deck 4-9"];
  for (const name of order) lines.push(`  "${name}"`, `    "${name}" 4-9`);
  return [...lines, '"Tail" 4-9', '"Last" 4-9'];
}
