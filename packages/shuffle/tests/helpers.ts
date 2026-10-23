import { expect, type Locator, type Page } from "@playwright/test";

import { type BlockRef, type HarnessBlock } from "./protocol.ts";

const URL = "http://127.0.0.1:5199/";

const SETTLE_MS = 200;

const NUDGE_PX = 0.5;

export type { HarnessBlock };

export interface BlockSpec extends BlockRef {
  text?: string;
  start?: number;
  end?: number;
}

interface NodeJSON {
  type: string;
  attrs?: Record<string, unknown>;
  content?: unknown[];
}

export interface HandleButton {
  index: number;
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface DragSession {
  block: BlockSpec;
  pointer: { x: number; y: number };
}

type Content = readonly NodeJSON[];

export async function openEditor(
  page: Page,
  content: Content,
  options: Record<string, unknown> = {},
): Promise<void> {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto(URL);
  await page.waitForFunction(() => !!window.__shuffle, null, { timeout: 20_000 });
  await page.evaluate(({ content, options }) => window.__shuffle.loadDoc(content, options), {
    content,
    options,
  });
  expect.soft(errors, "the harness reported an error while loading").toEqual([]);
  await settle(page);
}

export async function blocks(page: Page): Promise<HarnessBlock[]> {
  return page.evaluate(async () => {
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 40; attempt++) {
      try {
        return window.__shuffle.blocks();
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
    throw new Error(`shuffle harness: the editor view never settled: ${String(lastError)}`);
  });
}

export async function findBlock(page: Page, spec: BlockSpec): Promise<HarnessBlock> {
  const all = await blocks(page);
  const found = all.find((block) => matches(block, spec));
  if (!found)
    throw new Error(
      `No ${spec.type}${spec.text === undefined ? "" : ` "${spec.text}"`} in the document. Document: ${JSON.stringify(all.map(describeBlock))}`,
    );
  return found;
}

function matches(block: HarnessBlock, spec: BlockSpec): boolean {
  if (spec.type !== undefined && block.type !== spec.type) return false;
  if (spec.text !== undefined && block.text !== spec.text) return false;
  if (spec.start !== undefined && block.start !== spec.start) return false;
  if (spec.end !== undefined && block.end !== spec.end) return false;
  return true;
}

export function draggingFlag(page: Page): Promise<boolean> {
  return page.evaluate(() => window.__shuffle.dragging());
}

export async function settle(page: Page, ms = SETTLE_MS): Promise<void> {
  await page.waitForTimeout(ms);
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}

async function findHandle(page: Page, spec: BlockSpec): Promise<HandleButton> {
  const block = await findBlock(page, spec);
  const point = await hoverPoint(page, spec);
  if (!point) throw new Error(`No hoverable point for ${describeBlock(block)}`);
  await page.mouse.move(point.x, point.y);

  const label = sentenceCase(spec.type ?? "");
  await page.waitForFunction(
    ({ label, left, top }) => {
      const handles = [...document.querySelectorAll<HTMLElement>(".shuffle-drag-handle")];
      return handles.some(
        (handle) =>
          handle.textContent === label &&
          Math.abs(handle.getBoundingClientRect().left - left) < 40 &&
          Math.abs(handle.getBoundingClientRect().top - top) < 40,
      );
    },
    { label, left: block.left, top: block.top },
    { timeout: 5_000 },
  );

  const buttons = await handleButtons(page);
  const handle = buttons
    .filter((button) => button.label === label)
    .sort((a, b) => distance(a, block) - distance(b, block))[0];
  if (!handle) throw new Error(`No drag handle for ${describeBlock(block)}`);
  return handle;
}

const distance = (handle: HandleButton, block: HarnessBlock) =>
  Math.hypot(handle.left - block.left, handle.top - block.top);

export function handleButtons(page: Page): Promise<HandleButton[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".shuffle-drag-handle")].map((element, index) => {
      const rect = element.getBoundingClientRect();
      return {
        index,
        label: element.textContent ?? "",
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };
    }),
  );
}

export async function startDragOnHandle(page: Page, spec: BlockSpec): Promise<DragSession> {
  const handle = await findHandle(page, spec);
  const pointer = { x: handle.left + handle.width / 2, y: handle.top + handle.height / 2 };
  await page.mouse.move(pointer.x, pointer.y);
  await settle(page, 50);
  await page.mouse.down();
  await settle(page, 50);

  const session: DragSession = { block: spec, pointer };
  await movePointerTo(page, session, { x: pointer.x + 1, y: pointer.y + 1 });
  await settle(page);

  if (!(await cloneRect(page)))
    throw new Error(
      `Pressing the handle of ${describeBlock(await findBlock(page, spec))} did not start a drag`,
    );
  return session;
}

export async function placeCloneAt(
  page: Page,
  session: DragSession,
  point: { x: number; y: number },
): Promise<void> {
  const centre = await cloneCentre(page);
  await movePointerTo(page, session, {
    x: session.pointer.x + (point.x - centre.x),
    y: session.pointer.y + (point.y - centre.y),
  });
}

export async function moveCloneTo(
  page: Page,
  session: DragSession,
  point: { x: number; y: number },
): Promise<void> {
  await placeCloneAt(page, session, point);
  await settle(page);
  await nudge(page, session, NUDGE_PX, NUDGE_PX);
}

async function cloneCentre(page: Page): Promise<{ x: number; y: number }> {
  const rect = await cloneRect(page);
  if (!rect) throw new Error("No clone in the page: is a drag in progress?");
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

async function movePointerTo(
  page: Page,
  session: DragSession,
  point: { x: number; y: number },
): Promise<void> {
  session.pointer = point;
  await page.mouse.move(point.x, point.y, { steps: 1 });
}

async function nudge(page: Page, session: DragSession, dx: number, dy: number): Promise<void> {
  await movePointerTo(page, session, { x: session.pointer.x + dx, y: session.pointer.y + dy });
  await settle(page);
}

export async function endDrag(page: Page): Promise<void> {
  await page.mouse.up();
  await settle(page);
}

function cloneRect(page: Page): Promise<Rect | null> {
  return page.evaluate(() => {
    const clone = document.querySelector("[data-shuffle-clone]");
    if (!clone) return null;
    const rect = clone.getBoundingClientRect();
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  });
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

function columnLeft(page: Page, column: number): Promise<number> {
  return page.evaluate((column) => window.__shuffle.columnLeft(column), column);
}

export function hoverPoint(page: Page, spec: BlockSpec): Promise<{ x: number; y: number } | null> {
  return page.evaluate(
    async ({ type, text }) => {
      for (let attempt = 0; attempt < 40; attempt++) {
        try {
          return window.__shuffle.hoverPoint({ type, text });
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }
      return null;
    },
    { type: spec.type ?? "", text: spec.text },
  );
}

export async function dragBlockBelow(
  page: Page,
  source: BlockSpec,
  target: BlockSpec,
): Promise<void> {
  await dragBlockTo(page, source, target, (rect) => ({ x: centerX(rect), y: rect.bottom - 3 }));
}

export async function dragBlockAbove(
  page: Page,
  source: BlockSpec,
  target: BlockSpec,
): Promise<void> {
  await dragBlockTo(page, source, target, (rect) => ({ x: centerX(rect), y: rect.top + 3 }));
}

export async function dragBlockOnto(
  page: Page,
  source: BlockSpec,
  target: BlockSpec,
): Promise<void> {
  await dragBlockTo(page, source, target, (rect) => ({
    x: centerX(rect),
    y: rect.top + rect.height / 2,
  }));
}

export async function dragBlockBeside(
  page: Page,
  source: BlockSpec,
  target: BlockSpec,
): Promise<void> {
  await dragBlockTo(page, source, target, (rect) => {
    const gap = rect.width / 6;
    const roomOnTheRight = (rect.end ?? 12) < 12;
    return roomOnTheRight
      ? { x: rect.right + gap / 2, y: rect.top + rect.height / 2 }
      : { x: rect.left - gap / 2, y: rect.top + rect.height / 2 };
  });
}

export async function dragBlockToColumn(
  page: Page,
  source: BlockSpec,
  column: number,
): Promise<void> {
  const session = await startDragOnHandle(page, source);
  const rect = await cloneRect(page);
  if (!rect) throw new Error("No clone in the page: is a drag in progress?");
  const centre = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  await moveCloneTo(page, session, {
    x: (await columnLeft(page, column)) + rect.width / 2,
    y: centre.y,
  });
  await endDrag(page);
}

export async function dragBlockBy(
  page: Page,
  source: BlockSpec,
  dx: number,
  dy: number,
): Promise<void> {
  const session = await startDragOnHandle(page, source);
  const centre = await cloneCentre(page);
  await moveCloneTo(page, session, { x: centre.x + dx, y: centre.y + dy });
  await endDrag(page);
}

export async function dragBlockToPoint(
  page: Page,
  source: BlockSpec,
  point: { x: number; y: number },
): Promise<void> {
  const session = await startDragOnHandle(page, source);
  await moveCloneTo(page, session, point);
  await endDrag(page);
}

async function dragBlockTo(
  page: Page,
  source: BlockSpec,
  target: BlockSpec,
  pointFor: (target: HarnessBlock) => { x: number; y: number },
): Promise<void> {
  const session = await startDragOnHandle(page, source);
  await moveCloneTo(page, session, pointFor(await findBlock(page, target)));
  await endDrag(page);
}

const centerX = (rect: { left: number; width: number }) => rect.left + rect.width / 2;

export function inflatable(page: Page, label: string): Locator {
  return page.locator(".inflatable").filter({ hasText: label }).first();
}

export async function dragInflatableTo(
  page: Page,
  label: string,
  point: { x: number; y: number },
  column?: number,
): Promise<void> {
  const box = await inflatable(page, label).boundingBox();
  if (!box) throw new Error(`Inflatable "${label}" is not visible`);

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  const x = column === undefined ? point.x : startX + (await columnLeft(page, column)) - box.x;

  await page.mouse.move(startX, startY);
  await settle(page, 50);
  await page.mouse.down();
  await settle(page, 160);
  await page.mouse.move(x, startY, { steps: 5 });
  await settle(page);
  await page.mouse.move(x, point.y, { steps: 10 });
  await settle(page);
  await page.mouse.move(x + NUDGE_PX, point.y + NUDGE_PX, { steps: 1 });
  await settle(page);
  await page.mouse.up();
  await settle(page);
}

export async function tree(page: Page): Promise<string[]> {
  return (await blocks(page)).map(describeBlock);
}

function describeBlock(block: HarnessBlock): string {
  const name = ["paragraph", "heading", "card"].includes(block.type)
    ? JSON.stringify(block.text)
    : block.type;
  const span = block.start === null ? "" : ` ${block.start}-${block.end}`;
  return `${"  ".repeat(Math.max(0, block.depth - 1))}${name}${span}`;
}

function sentenceCase(value: string): string {
  const words = value.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
