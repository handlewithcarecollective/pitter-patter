import {
  ProseMirror,
  ProseMirrorDoc,
  reactKeys,
  useEditorEffect,
} from "@handlewithcare/react-prosemirror";
import { type Node } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { Decoration, type EditorView } from "prosemirror-view";
import { createRoot, type Root } from "react-dom/client";

import {
  DragHandles,
  shuffle,
  ShuffleSkeleton,
  supportsDrag,
  supportsResize,
} from "@pitter-patter/shuffle";

import {
  type BlockRef,
  type HarnessBlock,
  type HarnessOptions,
  type ShuffleHarness,
} from "./protocol.ts";
import { schema } from "./schema.ts";

function hoverDecorations(from: number, to: number) {
  return Decoration.node(from, to, { class: "shuffle-hover-block" });
}

/** Blocks offered by the inflatable menu, which the plugin drags into the doc. */
const inflatables = [
  {
    label: "Paragraph",
    node: schema.nodes.paragraph.create(null, schema.text("A brand new paragraph.")).toJSON(),
  },
  { label: "Image", node: schema.nodes.image.create().toJSON() },
  {
    label: "Card deck",
    node: schema.nodes.card_deck
      .create(null, [
        schema.nodes.card.create(null, [
          schema.nodes.paragraph.create(null, schema.text("Deck card one.")),
        ]),
        schema.nodes.card.create(null, [
          schema.nodes.paragraph.create(null, schema.text("Deck card two.")),
        ]),
      ])
      .toJSON(),
  },
];

let root: Root | null = null;
let currentView: EditorView | null = null;
let renderId = 0;

function Ready({ onReady }: { onReady: () => void }) {
  useEditorEffect(
    (view) => {
      currentView = view;
      onReady();
    },
    [onReady],
  );

  return null;
}

function Harness({
  state,
  editable,
  onReady,
}: {
  state: EditorState;
  editable: boolean;
  onReady: () => void;
}) {
  return (
    <div className="page">
      <div className="inflatable-menu">
        {inflatables.map(({ label, node }) => (
          <div key={label} className="inflatable" data-shuffle-inflatable={JSON.stringify(node)}>
            {label}
          </div>
        ))}
      </div>
      <ProseMirror defaultState={state} editable={editable ? () => true : () => false}>
        <ShuffleSkeleton>
          <ProseMirrorDoc />
          <DragHandles />
        </ShuffleSkeleton>
        <Ready onReady={onReady} />
      </ProseMirror>
      {/* A short document is not scrollable, and the library's scroll adjustment only runs when the
          page can scroll. This keeps every test document inside a scrolling window without moving
          the editor itself. */}
      <div className="scroll-runway" />
    </div>
  );
}

/** Waits for two animation frames, so pending rAF work has landed. */
function idle(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export function loadDoc(content: readonly unknown[], options: HarnessOptions = {}): Promise<void> {
  return new Promise((resolve) => {
    const state = EditorState.create({
      doc: schema.nodeFromJSON({ type: "doc", content }),
      plugins: [
        reactKeys(),
        shuffle({
          ...(options.hoverDecorations === false
            ? {}
            : { hoverDecorations: (from: number, to: number) => hoverDecorations(from, to) }),
          startDragInContentDOM: options.startDragInContentDOM ?? false,
        }),
      ],
    });

    root ??= createRoot(document.getElementById("root")!);

    renderId += 1;

    root.render(
      <Harness
        key={renderId}
        state={state}
        editable={options.editable ?? true}
        onReady={() => {
          void idle().then(resolve);
        }}
      />,
    );
  });
}

export function editor(): EditorView {
  if (!currentView) throw new Error("shuffle harness: no editor mounted");
  return currentView;
}

function num(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

/** ProseMirror attaches a `pmViewDesc` to every DOM node it renders. */
type PMViewDesc = { node?: Node };

function isShuffleNode(node: Node) {
  return supportsDrag(node) || supportsResize(node) || node.type.name === "row";
}

function matches(block: HarnessBlock, ref: BlockRef) {
  return block.type === ref.type && (ref.text === undefined || block.text === ref.text);
}

/**
 * Collects every shuffle-relevant node in document order, along with the rect of
 * the element ProseMirror renders for it.
 */
function collect(node: Node, pos: number, depth: number, path: number[], out: HarnessBlock[]) {
  node.forEach((child, offset, index) => {
    const childPos = pos + offset;

    if (isShuffleNode(child)) {
      const dom = editor().nodeDOM(childPos);
      const rect = dom instanceof HTMLElement ? dom.getBoundingClientRect() : null;

      out.push({
        // Every node reports its text content, so that a block without a text
        // block of its own (a card, a row) can still be found by text.
        type: child.type.name,
        text: child.textContent,
        pos: childPos,
        start: num(child.attrs["shuffleStart"]),
        end: num(child.attrs["shuffleEnd"]),
        zIndex: num(child.attrs["zIndex"]) ?? 0,
        alignment: typeof child.attrs["alignment"] === "string" ? child.attrs["alignment"] : null,
        depth: depth + 1,
        path: [...path, index],
        childCount: child.childCount,
        left: rect?.left ?? 0,
        top: rect?.top ?? 0,
        right: rect?.right ?? 0,
        bottom: rect?.bottom ?? 0,
        width: rect?.width ?? 0,
        height: rect?.height ?? 0,
      });
    }

    collect(child, childPos + 1, depth + 1, [...path, index], out);
  });
}

/** The innermost element under a point that Shuffle would treat as draggable. */
function draggableAt(x: number, y: number): Element | null {
  for (const element of document.elementsFromPoint(x, y)) {
    const node = (element as Element & { pmViewDesc?: PMViewDesc }).pmViewDesc?.node;
    if (node && isShuffleNode(node)) return element;
  }
  return null;
}

export const harness: ShuffleHarness = {
  loadDoc,

  doc() {
    return editor().state.doc.toJSON();
  },

  blocks() {
    const out: HarnessBlock[] = [];
    collect(editor().state.doc, 0, 0, [], out);
    return out;
  },

  handles() {
    return Array.from(document.querySelectorAll(".shuffle-drag-handle"), (dom) => {
      const rect = dom.getBoundingClientRect();
      return {
        label: dom.textContent ?? "",
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
      };
    });
  },

  hoverPoint(ref) {
    const block = harness.blocks().find((b) => matches(b, ref));
    if (!block) throw new Error(`shuffle harness: no ${ref.type} block in document`);

    const dom = editor().nodeDOM(block.pos);
    if (!(dom instanceof HTMLElement)) return null;

    // Scan the middle column first, then the right and left edges, so that
    // containers and rows resolve to a point the block itself owns (a gap
    // between its children, or its spare columns) rather than to a child.
    const xs = [block.left + block.width / 2, block.right - 4, block.left + 4];

    for (const x of xs) {
      for (let y = Math.round(block.top) + 2; y <= block.bottom - 2; y += 2) {
        if (draggableAt(x, y) === dom) return { x, y };
      }
    }

    return null;
  },

  columnLeft(column) {
    const bar = document.querySelector(`[data-shuffle-skeleton-bar="${column}"]`);
    if (!bar) throw new Error(`shuffle harness: no skeleton column ${column}`);
    return bar.getBoundingClientRect().left;
  },

  dragging() {
    return document.shuffleDragging === true;
  },
};
