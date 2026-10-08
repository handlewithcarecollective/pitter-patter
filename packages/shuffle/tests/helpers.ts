/**
 * Shared helpers for the shuffle Playwright suite.
 *
 * The suite drives real pointer events at real drag handles and asserts on the resulting
 * document, so geometry is always read back from the page (`findBlock`, `cloneRect`) rather than
 * computed here, and gestures are written the way a user would describe them: "drop this block
 * below that one".
 *
 * Three properties of the library shape every gesture below:
 *
 * 1. Placement is decided from the centre of the floating clone (`move` in `src/plugin.ts`), not
 *    from the pointer - and the clone does not hold still for it. It is re-anchored to the dragged
 *    node whenever the document changes mid-drag, and it is slid to keep pace with the page when the
 *    scroll tween runs (`syncCloneWithScroll`). Where the pointer is therefore says nothing reliable
 *    about where the clone is: `aimCloneAt` measures the clone and moves the pointer by the
 *    difference, and every aim below is stated as a point in the page rather than a pointer delta.
 * 2. The clone's opening `transform` transition is switched off 100ms after the clone is created
 *    (`src/plugin.ts`), and `startDragOnHandle` waits past that, so from then on the clone sits
 *    exactly where the pointer's last event put it, and every pointermove is evaluated against the
 *    clone's rectangle at that instant.
 * 3. One pointermove is one decision, and after dispatching a transaction the library re-runs the
 *    current move against the document that transaction produced. This matters more than anything
 *    else in the suite, because the second decision is not always the same as the first, and a
 *    release between them keeps the first one. Grouping a block with a neighbour is a two-decision
 *    move - reposition, then group - while a straight reorder takes one, and holding a block over
 *    the block below its target groups it with the wrong neighbour. So there are two gestures here
 *    and a test picks one:
 *
 *    - `dragBlockBelow`, `dragBlockOnto`, …: place the clone, pause, nudge, release. A pointer that
 *      arrives and settles - every test about a row being formed, a row breaking, or a block
 *      finding its place among its neighbours.
 *    - `placeCloneAt` then `endDrag`: put the clone somewhere and let go on the same event. A flick
 *      - the single decision, taken before anything else has changed.
 *
 *    Tests wait for the document to go quiet before asserting, and assert what they find.
 */

import { expect, type Locator, type Page } from "@playwright/test";

import { type BlockRef, type HarnessBlock } from "./protocol.ts";

const URL = "http://127.0.0.1:5199/";

/** Long enough for CSS transitions and the library's pending move to have run. */
const SETTLE_MS = 200;

/** The nudge that forces a re-evaluation once a move has settled. */
const NUDGE_PX = 0.5;

export type { HarnessBlock };

/**
 * A block named in a spec. `text` is matched exactly, and the span can pin down one of several
 * blocks with the same content.
 */
export interface BlockSpec extends BlockRef {
  text?: string;
  start?: number;
  end?: number;
}

/** A ProseMirror node as JSON, as produced by the builders in `nodes.ts`. */
interface NodeJSON {
  type: string;
  attrs?: Record<string, unknown>;
  content?: unknown[];
}

/** The drag handle button, with the index it has in the page. */
export interface HandleButton {
  index: number;
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

/** A drag in progress, which is only ever a pointer position: the clone is measured, not tracked. */
export interface DragSession {
  block: BlockSpec;
  /** Where the pointer is now. */
  pointer: { x: number; y: number };
}

type Content = readonly NodeJSON[];

/**
 * Load a document and wait for the editor to be interactive. `loadDoc` only resolves once the
 * editor is mounted and two animation frames have passed, so it doubles as the readiness signal.
 */
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
  // Soft: Playwright collects the failure instead of throwing, and the harness keeps
  // running, so the errors are reported alongside whatever the test went on to see.
  expect.soft(errors, "the harness reported an error while loading").toEqual([]);
  await settle(page);
}

/**
 * Every shuffle node in the document, in document order, with span and on-screen rect.
 *
 * Retried because the editor's state can lead its DOM: transactions dispatched from inside the
 * layout animation reach ProseMirror before React has re-rendered the view, and while that gap is
 * open the harness cannot resolve a document position to an element. It closes within a frame or
 * two, so the answer is to wait rather than to work around it.
 */
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

/** The library's `document.shuffleDragging` flag. True from pointerdown to pointerup. */
export function draggingFlag(page: Page): Promise<boolean> {
  return page.evaluate(() => window.__shuffle.dragging());
}

/** Wait for transitions, animations and the library's pending move to have run. */
export async function settle(page: Page, ms = SETTLE_MS): Promise<void> {
  await page.waitForTimeout(ms);
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}

/* -------------------------------------------------------------------------------------------------
 * Handles
 * ------------------------------------------------------------------------------------------------- */

/**
 * Hover `spec` until its drag handle is rendered, and return it.
 *
 * Handles are labelled with the node type and positioned at the node's top left, shifted right by
 * 32px when they would sit on top of an ancestor's handle, so the handle for a block is the one
 * with its label that is nearest to the block's top left corner.
 */
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

/**
 * Hover `spec`, press its handle, then move the pointer a pixel so the library builds its clone,
 * which is what every later aim is measured against.
 */
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

/* -------------------------------------------------------------------------------------------------
 * Moving the clone
 * ------------------------------------------------------------------------------------------------- */

/**
 * Put the clone's centre on `point` with a single pointer event.
 *
 * The clone is measured where it is rather than predicted from where the pointer started: the
 * library re-anchors it to the dragged node whenever the document changes under the drag, and
 * slides it with the page (`syncCloneWithScroll`), so a mapping taken earlier in the drag is off by
 * however much the document has moved since.
 *
 * One event, because one event is one decision. The clone's opening transition is switched off 100ms
 * after it is created (`src/plugin.ts`), and `startDragOnHandle` waits past that, so the clone lands
 * exactly where this puts it and the decision is taken there. Letting the drag live longer is not
 * neutral: after dispatching a transaction the library re-runs the current move, and a second
 * decision taken against the document the first one produced is a different decision.
 */
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

/**
 * Move the clone to `point` and hold it there: place, let the document settle, then nudge half a
 * pixel so the library takes its follow-up decision with the clone at rest on `point`. Only for
 * tests that are about a drag being held, not about a drop.
 */
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

/** The x of the left edge of a grid column, taken from the skeleton bars behind the editor. */
function columnLeft(page: Page, column: number): Promise<number> {
  return page.evaluate((column) => window.__shuffle.columnLeft(column), column);
}

/** The point inside `spec` that the library treats as belonging to `spec` itself, not a child. */
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

/* -------------------------------------------------------------------------------------------------
 * Gestures
 * ------------------------------------------------------------------------------------------------- */

/** Press the handle of `source` and drop it below `target`, in its vertical centre band. */
export async function dragBlockBelow(
  page: Page,
  source: BlockSpec,
  target: BlockSpec,
): Promise<void> {
  await dragBlockTo(page, source, target, (rect) => ({ x: centerX(rect), y: rect.bottom - 3 }));
}

/** Press the handle of `source` and drop it above `target`. */
export async function dragBlockAbove(
  page: Page,
  source: BlockSpec,
  target: BlockSpec,
): Promise<void> {
  await dragBlockTo(page, source, target, (rect) => ({ x: centerX(rect), y: rect.top + 3 }));
}

/**
 * Drop `source` onto the vertical centre of `target` - the library's auto-group zone.
 *
 * Auto-grouping reflows the document upwards, so this is reliable when the block moves *up*: when
 * it moves down, the drop point ends up below the shrunken document and the block is moved to the
 * end instead (asserted as-is in `autogroup.spec.ts`).
 */
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

/**
 * Drop `source` at `target`'s vertical centre but clear of it horizontally, in the columns
 * `target` leaves free. Blocks at the same height are grouped into a row.
 */
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

/** Slide `source` so that it starts at grid `column` (1-based) and nothing else changes. */
export async function dragBlockToColumn(
  page: Page,
  source: BlockSpec,
  column: number,
): Promise<void> {
  const session = await startDragOnHandle(page, source);
  // The library picks the column from the clone's left edge, so aim the clone with that edge on the
  // grid line, keeping whatever height it is at.
  const rect = await cloneRect(page);
  if (!rect) throw new Error("No clone in the page: is a drag in progress?");
  const centre = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  await moveCloneTo(page, session, {
    x: (await columnLeft(page, column)) + rect.width / 2,
    y: centre.y,
  });
  await endDrag(page);
}

/** Drag `source` by a raw delta. For clamping and no-op cases. */
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

/** Drag `source` so that its clone's centre lands on an absolute page point. */
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

/* -------------------------------------------------------------------------------------------------
 * Inflatables
 * ------------------------------------------------------------------------------------------------- */

export function inflatable(page: Page, label: string): Locator {
  return page.locator(".inflatable").filter({ hasText: label }).first();
}

/**
 * Drag an inflatable chip so that its clone's centre lands on `point`. `column` optionally slides
 * the chip so the clone's left edge - which decides the span of the inserted node - lands on that
 * grid line.
 */
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
  // The clone is the chip translated by the pointer delta, so its left edge is
  // `box.left + (x - startX)`; solve for the travel that puts it on the column.
  const x = column === undefined ? point.x : startX + (await columnLeft(page, column)) - box.x;

  await page.mouse.move(startX, startY);
  await settle(page, 50);
  await page.mouse.down();
  // Past the clone's opening transition, so the moves below put it where they say.
  await settle(page, 160);
  // The chip travels across first, then down, then holds: each move is a decision, and the last
  // one - the nudge - is taken with the clone at rest on the drop point.
  await page.mouse.move(x, startY, { steps: 5 });
  await settle(page);
  await page.mouse.move(x, point.y, { steps: 10 });
  await settle(page);
  await page.mouse.move(x + NUDGE_PX, point.y + NUDGE_PX, { steps: 1 });
  await settle(page);
  await page.mouse.up();
  await settle(page);
}

/* -------------------------------------------------------------------------------------------------
 * Reporting
 * ------------------------------------------------------------------------------------------------- */

/** The document as an indented list of `"text"`/`type` plus `start-end`, for readable failures. */
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

/**
 * `paragraph` -> `Paragraph`, `card_deck` -> `Card deck`: the label the library gives a drag
 * handle, which is the node type in sentence case.
 */
function sentenceCase(value: string): string {
  const words = value.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
