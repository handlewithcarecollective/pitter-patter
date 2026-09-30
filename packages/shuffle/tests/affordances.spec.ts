import { expect, test } from "@playwright/test";

import {
  draggingFlag,
  findBlock,
  handleButtons,
  hoverPoint,
  moveCloneTo,
  openEditor,
  settle,
  startDragOnHandle,
  tree,
  type BlockSpec,
} from "./helpers.ts";
import { container, h, img, p, rowWith } from "./nodes.ts";

/**
 * The affordances around the drags: the handles, the clone, the marks the plugin puts on the block
 * being moved, and the plugin options that switch parts of it on and off.
 */

const T = (text: string): BlockSpec => ({ type: "paragraph", text });

const six = () => [h("Header"), p("P1"), p("P2"), p("P3"), p("P4"), p("P5")];

test("a hovered block gets a drag handle named after its type", async ({ page }) => {
  await openEditor(page, [h("Header"), p("One"), container(p("In"), p("Deeper")), img()]);

  const paragraph = await hoverPoint(page, T("One"));
  await page.mouse.move(paragraph?.x ?? 0, paragraph?.y ?? 0);
  await page.waitForTimeout(300);
  expect((await handleButtons(page)).map((handle) => handle.label)).toEqual(["Paragraph"]);

  const image = await hoverPoint(page, { type: "image" });
  await page.mouse.move(image?.x ?? 0, image?.y ?? 0);
  await page.waitForTimeout(300);
  expect((await handleButtons(page)).map((handle) => handle.label)).toEqual(["Image"]);
});

test("rows and decks get handles too", async ({ page }) => {
  await openEditor(page, [
    h("Header"),
    rowWith(
      { shuffleStart: 0, shuffleEnd: 13 },
      p("L", { shuffleStart: 1, shuffleEnd: 5 }),
      p("R", { shuffleStart: 7, shuffleEnd: 11 }),
    ),
  ]);

  const row = await hoverPoint(page, { type: "row" });
  await page.mouse.move(row?.x ?? 0, row?.y ?? 0);
  await page.waitForTimeout(300);
  expect((await handleButtons(page)).map((handle) => handle.label)).toEqual(["Row"]);
});

test("handles of nested blocks do not sit on top of each other", async ({ page }) => {
  await openEditor(page, [h("Header"), container(p("First"), p("Second")), p("Tail")]);

  // The container and its first child start at the same corner, so the library shifts the inner
  // handle aside by 32px.
  const first = await hoverPoint(page, T("First"));
  await page.mouse.move(first?.x ?? 0, first?.y ?? 0);
  await page.waitForTimeout(300);

  const handles = await handleButtons(page);
  expect(handles.map((handle) => handle.label)).toEqual(["Container", "Paragraph"]);
  expect(handles[1].top).toBe(handles[0].top);
  expect(handles[1].left - handles[0].left).toBeCloseTo(32, 0);
});

test("only the block under the pointer is marked as hovered", async ({ page }) => {
  await openEditor(page, six());
  const point = await hoverPoint(page, T("P3"));
  if (!point) throw new Error("No hover point for P3");
  await page.mouse.move(point.x, point.y);

  // Auto-waiting assertions: the decoration lands a frame or two after the pointer does.
  const marked = page.locator(".shuffle-hover-block");
  await expect(marked).toHaveCount(1);
  await expect(marked).toHaveText("P3");
});

test("hover decorations can be turned off", async ({ page }) => {
  await openEditor(page, six(), { hoverDecorations: false });
  const point = await hoverPoint(page, T("P3"));
  if (!point) throw new Error("No hover point for P3");
  await page.mouse.move(point.x, point.y);
  // Asserting that nothing happens needs a real wait, not an auto-waiting assertion.
  await settle(page, 400);

  await expect(page.locator(".shuffle-hover-block")).toHaveCount(0);
});

test("the dragged block is marked, and the page is told a drag is running", async ({ page }) => {
  await openEditor(page, six());
  const session = await startDragOnHandle(page, T("P3"));
  const p5 = await findBlock(page, T("P5"));
  await moveCloneTo(page, session, { x: p5.left + p5.width / 2, y: p5.bottom - 3 });

  const marks = await page.evaluate(() => {
    const marked = document.querySelector("[data-shuffle-active]");
    return {
      marked: marked?.textContent,
      count: document.querySelectorAll("[data-shuffle-active]").length,
      dragging: window.__shuffle.dragging(),
    };
  });
  expect(marks).toEqual({ marked: "P3", count: 1, dragging: true });

  await page.mouse.up();
  await page.waitForTimeout(400);
  expect(await draggingFlag(page)).toBe(false);
  expect(await page.locator("[data-shuffle-active]").count()).toBe(0);
});

test("the clone is a child of the body that the pointer can pass through", async ({ page }) => {
  await openEditor(page, six());
  const session = await startDragOnHandle(page, T("P3"));
  await moveCloneTo(page, session, { x: 512, y: 400 });

  const clone = await page.evaluate(() => {
    const element = document.querySelector("[data-shuffle-clone]");
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return {
      parent: element.parentElement?.tagName,
      pointerEvents: getComputedStyle(element).pointerEvents,
      centre: {
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2),
      },
    };
  });
  expect(clone?.parent).toBe("BODY");
  expect(clone?.pointerEvents).toBe("none");
  // The clone rests within a pixel of where it was aimed.
  expect(Math.abs((clone?.centre.x ?? 0) - 512)).toBeLessThanOrEqual(1);
  expect(Math.abs((clone?.centre.y ?? 0) - 400)).toBeLessThanOrEqual(1);

  await page.mouse.up();
  await page.waitForTimeout(400);
  expect(await page.locator("[data-shuffle-clone]").count()).toBe(0);
});

test("text can be selected instead of dragged, unless the editor opts in", async ({ page }) => {
  await openEditor(page, six(), { startDragInContentDOM: false });
  const point = await hoverPoint(page, T("P2"));
  const p4 = await findBlock(page, T("P4"));

  await page.mouse.move(point?.x ?? 0, point?.y ?? 0);
  await page.mouse.down();
  await page.mouse.move(p4.left + 40, p4.bottom - 3, { steps: 10 });
  await page.waitForTimeout(300);

  expect(await draggingFlag(page)).toBe(false);
  expect(await tree(page)).toEqual([
    '"Header" 4-9',
    '"P1" 4-9',
    '"P2" 4-9',
    '"P3" 4-9',
    '"P4" 4-9',
    '"P5" 4-9',
  ]);
  await page.mouse.up();
});

test("with startDragInContentDOM, dragging the text itself moves the block", async ({ page }) => {
  await openEditor(page, six(), { startDragInContentDOM: true });
  const point = await hoverPoint(page, T("P2"));
  const p4 = await findBlock(page, T("P4"));

  await page.mouse.move(point?.x ?? 0, point?.y ?? 0);
  await page.mouse.down();
  await page.mouse.move(p4.left + 40, p4.bottom - 3, { steps: 10 });
  await page.waitForTimeout(400);
  expect(await draggingFlag(page)).toBe(true);

  await page.mouse.up();
  await page.waitForTimeout(300);
  const lines = await tree(page);
  expect(lines.indexOf('"P2" 2-7')).toBeGreaterThan(lines.indexOf('"P4" 4-9'));
});

test("the browser's own drag is disabled on block content", async ({ page }) => {
  await openEditor(page, six());

  const prevented = await page.evaluate(() => {
    const block = document.querySelector('p[data-node-type="paragraph"]');
    if (!block) throw new Error("no paragraph in the document");
    const event = new DragEvent("dragstart", { bubbles: true, cancelable: true });
    block.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(prevented).toBe(true);
});

test("a read only editor has nothing to drag", async ({ page }) => {
  await openEditor(page, six(), { editable: false });

  const point = await hoverPoint(page, T("P2"));
  await page.mouse.move(point?.x ?? 0, point?.y ?? 0);
  await page.waitForTimeout(400);
  expect(await handleButtons(page)).toEqual([]);

  const box = await page.locator(".inflatable").first().boundingBox();
  await page.mouse.move(box?.x ?? 0, (box?.y ?? 0) + 10);
  await page.mouse.down();
  await page.mouse.move(512, 300, { steps: 10 });
  await page.waitForTimeout(400);
  await page.mouse.up();
  await page.waitForTimeout(400);

  expect(await draggingFlag(page)).toBe(false);
  expect(await tree(page)).toEqual([
    '"Header" 4-9',
    '"P1" 4-9',
    '"P2" 4-9',
    '"P3" 4-9',
    '"P4" 4-9',
    '"P5" 4-9',
  ]);
});
