import { widget } from "@handlewithcare/react-prosemirror";
import { Node } from "prosemirror-model";
import { EditorState, Plugin, PluginKey, Transaction } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import throttle from "raf-throttle";

import { randomRef } from "@pitter-patter/refs";

import { DragPlaceholder } from "./components/DragPlaceholder.tsx";
import { startDragOnPointerDown } from "./dragHandlers.ts";
import { isShuffleContainer, isShuffleRow, supportsDrag, supportsResize } from "./schema.ts";
import { ViewDesc } from "./viewDesc.ts";

declare global {
  interface Document {
    shuffleDragging: boolean;
  }

  interface ShadowRoot {
    shuffleDragging: boolean;
  }
}

interface ShufflePluginStartMeta {
  type: "start";
}

interface ShufflePluginEndMeta {
  type: "end";
}

interface ShufflePluginResizeMeta {
  type: "resize";
  payload: {
    pos: number;
    start: number;
    end: number;
  };
}

interface ShufflePluginMapMeta {
  type: "map";
  payload: {
    newPos: number;
    oldRect: DOMRect | undefined;
  };
}

interface ShufflePluginHoverMeta {
  type: "hover";
  payload: {
    positions: { from: number; to: number }[];
  };
}

interface ShufflePluginRepositionMeta {
  type: "reposition";
  payload: {
    newPos: number;
  };
}

export type ShufflePluginMeta =
  | ShufflePluginStartMeta
  | ShufflePluginEndMeta
  | ShufflePluginMapMeta
  | ShufflePluginResizeMeta
  | ShufflePluginHoverMeta
  | ShufflePluginRepositionMeta;

export interface ShufflePluginState {
  deco: DecorationSet;
  comp: string | undefined;
  activeNodePos: number | undefined;
  hoverPositions: { from: number; to: number }[];
  startDragInContentDOM: boolean;
  placeholderRect: DOMRect | undefined;
  placeholderPos: number | undefined;
}

export const shufflePluginKey = new PluginKey<ShufflePluginState>("@pitter-patter/shuffle");

export interface ShufflePluginOptions {
  /**
   * In schemas that can have deeply nested nodes, it can be helpful
   * to use borders or highlights to indicate to the user which nodes
   * are being hovered over.
   *
   * This function will be called on each hovered node to determine
   * whether to render a node decoration. It should always return
   * a node decoration (via Decoration.node()).
   */
  hoverDecorations?: (from: number, to: number, node: Node) => Decoration | null;
  /**
   * If enabled, when the user starts a drag within a node's contentDOM,
   * it will activate the plugin, rather than starting a selection.
   *
   * Defaults to false.
   */
  startDragInContentDOM?: boolean;
}

/**
 * A ProseMirror plugin factory. Manages decorations, state, and event listeners necessary for
 * autogroup, reorder, and reposition behaviors.
 */
export function shuffle({
  hoverDecorations,
  startDragInContentDOM = false,
}: ShufflePluginOptions = {}) {
  return new Plugin<ShufflePluginState>({
    key: shufflePluginKey,
    state: {
      init(_, state) {
        const decorations: Decoration[] = [];
        state.doc.descendants((node, pos, _parent, index) => {
          const { shuffleStart, shuffleEnd, zIndex, alignment } = node.attrs;

          if ((shuffleStart === undefined || shuffleEnd === undefined) && !isShuffleRow(node)) {
            return true;
          }

          decorations.push(
            Decoration.node(pos, pos + node.nodeSize, {
              ...(!isShuffleRow(node) && {
                class: `shuffle-block start-${getShuffleGridClass(shuffleStart)} end-${getShuffleGridClass(shuffleEnd)}`,
              }),
              style: `grid-row: ${index + 1}; z-index: ${zIndex ?? 0};${alignment ? ` align-items: ${alignment};` : ""}`,
            }),
          );

          return true;
        });

        return {
          deco: DecorationSet.create(state.doc, decorations),
          comp: undefined,
          activeNodePos: undefined,
          hoverPositions: [],
          placeholderRect: undefined,
          startDragInContentDOM,
          placeholderPos: undefined,
        };
      },
      apply(tr, value, oldState, newState) {
        const next = reduceState(tr, value, oldState, newState);

        const decorations = buildDecorations(tr, next, newState, hoverDecorations);

        return {
          ...next,
          deco: DecorationSet.create(tr.doc, decorations),
        };
      },
    },
    appendTransaction(transactions, _oldState, newState) {
      const endTr = transactions.find(
        (tr) => (tr.getMeta(shufflePluginKey) as ShufflePluginMeta | undefined)?.type === "end",
      );
      const startTr = transactions.find(
        (tr) => (tr.getMeta(shufflePluginKey) as ShufflePluginMeta | undefined)?.type === "map",
      );

      const tr = newState.tr;

      if (endTr) {
        const collapsible: [number, Node][] = [];
        newState.doc.descendants((node, pos) => {
          if (isShuffleRow(node) && node.childCount <= 1) {
            collapsible.push([pos, node]);
          }
          if (isShuffleContainer(node) && node.childCount === 0) {
            collapsible.push([pos, node]);
          }
        });

        for (const [pos, node] of collapsible) {
          tr.replaceWith(tr.mapping.map(pos), tr.mapping.map(pos + node.nodeSize), node.children);
        }
      } else if (startTr) {
        const activeNodePos = shufflePluginKey.getState(newState)?.activeNodePos;
        if (activeNodePos === undefined) return null;

        tr.setNodeAttribute(activeNodePos, "zIndex", findHighestZIndex(newState.doc) + 1);
      }

      return tr.docChanged ? tr : null;
    },
    props: {
      decorations(state) {
        return shufflePluginKey.getState(state)?.deco;
      },
      attributes: {
        class: "shuffle-block start-left end-right",
      },
      handleDOMEvents: {
        dragstart(_, event) {
          event.preventDefault();
        },
        mousemove: throttle((view, event) => {
          if (!view.editable) return false;

          const elements = document.elementsFromPoint(event.clientX, event.clientY);
          const positions = elements
            .filter((el) => {
              const dom: Element & { pmViewDesc?: ViewDesc } = el;
              return supportsResize(dom.pmViewDesc?.node) || supportsDrag(dom.pmViewDesc?.node);
            })
            .map((el) => {
              const dom = el as Element & { pmViewDesc: ViewDesc };
              return {
                from: dom.pmViewDesc.posBefore,
                to: dom.pmViewDesc.posBefore + dom.pmViewDesc.node.nodeSize,
              };
            });

          const shuffleState = shufflePluginKey.getState(view.state);
          const currentPositions = shuffleState?.hoverPositions ?? [];

          if (arePositionsEqual(positions, currentPositions)) {
            return false;
          }

          view.dispatch(
            view.state.tr.setMeta(shufflePluginKey, {
              type: "hover",
              payload: { positions },
            } satisfies ShufflePluginMeta),
          );

          return false;
        }),
        pointerdown(view, event) {
          if (!view.editable) return false;
          if (!(event.target instanceof HTMLElement)) return false;

          let dom: null | (HTMLElement & { pmViewDesc?: ViewDesc }) = event.target;

          while (
            dom &&
            dom !== view.dom &&
            !supportsResize(dom.pmViewDesc?.node) &&
            !supportsDrag(dom.pmViewDesc?.node)
          ) {
            dom = dom.parentElement;
          }

          if (!dom || dom === view.dom) return false;

          const viewDesc = dom.pmViewDesc;

          if (!viewDesc) return false;
          if (!startDragInContentDOM && viewDesc.contentDOM?.contains(event.target)) return false;

          const { selection } = view.state;

          const before = viewDesc.posBefore;
          const after = before + viewDesc.node.nodeSize;
          if (
            before < selection.from &&
            before < selection.to &&
            after > selection.from &&
            after > selection.to
          ) {
            return false;
          }

          return startDragOnPointerDown(
            view,
            viewDesc.posBefore,
            dom,
            event.clientX,
            event.clientY,
          );
        },
      },
    },
    view(view) {
      function handleInflatePointerDown(event: PointerEvent) {
        if (!view.editable) return;
        if (!(event.target instanceof Element)) return;

        if (view.dom.contains(event.target)) return;

        const draggable = event.target.closest("[data-shuffle-inflatable]");

        if (!(draggable instanceof HTMLElement)) return;

        startDragOnPointerDown(view, null, draggable, event.clientX, event.clientY);
      }

      view.root.addEventListener("pointerdown", handleInflatePointerDown as EventListener);

      function handleTouchMove(event: TouchEvent) {
        if (view.root.shuffleDragging) {
          event.preventDefault();
        }
      }

      view.root.addEventListener("touchmove", handleTouchMove as EventListener, { passive: false });

      return {
        destroy() {
          view.root.removeEventListener("pointerdown", handleInflatePointerDown as EventListener);
          view.root.removeEventListener("touchmove", handleTouchMove as EventListener);
        },
      };
    },
  });
}

function reduceState(
  tr: Transaction,
  value: ShufflePluginState,
  oldState: EditorState,
  newState: EditorState,
): ShufflePluginState {
  const meta = tr.getMeta(shufflePluginKey) as ShufflePluginMeta;

  switch (meta?.type) {
    case "hover": {
      return {
        ...value,
        hoverPositions: meta.payload.positions,
      };
    }
    case "start": {
      return {
        ...value,
        comp: randomRef(),
        placeholderRect: undefined,
        placeholderPos: undefined,
      };
    }
    case "end": {
      return {
        ...value,
        comp: undefined,
        activeNodePos: undefined,
        placeholderRect: undefined,
        placeholderPos: undefined,
      };
    }
    case "reposition":
    case "map": {
      const nextActiveNodePos = meta.payload.newPos;
      const activeDepth =
        value.activeNodePos === undefined
          ? undefined
          : oldState.doc.resolve(value.activeNodePos).depth;
      const nextActiveDepth =
        nextActiveNodePos === undefined ? undefined : newState.doc.resolve(nextActiveNodePos).depth;

      if (meta.type === "reposition") {
        return {
          ...value,
          activeNodePos: nextActiveNodePos,
        };
      }

      return {
        ...value,
        activeNodePos: nextActiveNodePos,
        placeholderRect: activeDepth !== nextActiveDepth ? meta.payload.oldRect : undefined,
        ...(value.activeNodePos !== undefined && {
          placeholderPos: tr.mapping.map(value.activeNodePos),
        }),
      };
    }
    default: {
      return {
        ...value,
        ...(value.activeNodePos !== undefined && {
          activeNodePos: tr.mapping.map(value.activeNodePos),
        }),
        hoverPositions: value.hoverPositions
          .map(({ from, to }) => ({
            from: tr.mapping.mapResult(from),
            to: tr.mapping.mapResult(to),
          }))
          .filter(({ from, to }) => !from.deleted && !to.deleted)
          .map(({ from, to }) => ({ from: from.pos, to: to.pos })),
      };
    }
  }
}

function buildDecorations(
  tr: Transaction,
  next: ShufflePluginState,
  newState: EditorState,
  hoverDecorations: ShufflePluginOptions["hoverDecorations"],
) {
  let placeholderGridRow = 0;
  let placeholderParent: Node | null = null;
  const decorations: Decoration[] = [];
  tr.doc.descendants((node, pos, parent, index) => {
    let i = index;
    if (pos === next.placeholderPos) {
      placeholderParent = parent;
      placeholderGridRow = index + 1;
      i++;
    } else if (placeholderParent === parent) {
      i++;
    }
    const { shuffleStart, shuffleEnd, zIndex, alignment } = node.attrs;

    if ((shuffleStart === undefined || shuffleEnd === undefined) && !isShuffleRow(node)) {
      return true;
    }

    decorations.push(
      Decoration.node(pos, pos + node.nodeSize, {
        ...(!isShuffleRow(node) && {
          class: `shuffle-block start-${getShuffleGridClass(shuffleStart)} end-${getShuffleGridClass(shuffleEnd)}`,
        }),
        style: `grid-row: ${i + 1}; z-index: ${zIndex ?? 0};${alignment ? ` align-items: ${alignment};` : ""}`,
      }),
    );

    return true;
  });

  if (hoverDecorations) {
    next.hoverPositions.forEach(({ from, to }) => {
      const $from = tr.doc.resolve(from);
      const node = $from.nodeAfter;

      if (!node) return;

      const hoverDeco = hoverDecorations(from, to, node);
      if (hoverDeco) {
        decorations.push(hoverDeco);
      }
    });
  }

  if (next.activeNodePos !== undefined) {
    const node = newState.doc.nodeAt(next.activeNodePos);

    if (node) {
      decorations.push(
        Decoration.node(
          next.activeNodePos,
          next.activeNodePos + node.nodeSize,
          { style: "opacity: 0.4" },
          { shuffleActive: true },
        ),
      );
    }
  }

  if (next.placeholderRect && next.placeholderPos !== undefined) {
    decorations.push(
      widget(next.placeholderPos, DragPlaceholder, {
        width: next.placeholderRect.width,
        height: next.placeholderRect.height,
        gridRow: placeholderGridRow,
        key: "shuffle-placeholder",
      }),
    );
  }

  return decorations;
}

function getShuffleGridClass(col: number) {
  if (col === 0) return "left";
  if (col === 13) return "right";
  return col;
}

function arePositionsEqual(
  positions: { from: number; to: number }[],
  decorations: { from: number; to: number }[],
) {
  if (positions.length !== decorations.length) return false;

  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i]!;
    const deco = decorations[i]!;

    if (pos.from !== deco.from || pos.to !== deco.to) return false;
  }

  return true;
}

function findHighestZIndex(doc: Node) {
  let highest = 0;
  doc.descendants((node) => {
    if (!supportsResize(node) && !supportsDrag(node)) {
      return true;
    }

    highest = Math.max(highest, node.attrs["zIndex"] ?? 0);
    return true;
  });

  return highest;
}
