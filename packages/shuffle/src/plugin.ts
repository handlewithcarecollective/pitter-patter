import { AutoLayout, createLayout, Timeline } from "animejs";
import { animate } from "motion/mini";
import { Node, Node as PmNode } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import throttle from "raf-throttle";

import { randomRef } from "@pitter-patter/refs";

import { isShuffleRow, supportsDrag, supportsResize } from "./schema";
import { autogroup } from "./transform/autogroup";
import { inflate } from "./transform/inflate.js";
import { reorder } from "./transform/reorder";
import { reposition } from "./transform/reposition";
import { TranslateCalculator } from "./translation.js";

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
  };
}

interface ShufflePluginHoverMeta {
  type: "hover";
  payload: {
    positions: { from: number; to: number }[];
  };
}

export type ShufflePluginMeta =
  | ShufflePluginStartMeta
  | ShufflePluginEndMeta
  | ShufflePluginMapMeta
  | ShufflePluginResizeMeta
  | ShufflePluginHoverMeta;

export interface ShufflePluginState {
  deco: DecorationSet;
  comp: string | undefined;
  activeNodePos: number | undefined;
  hoverPositions: { from: number; to: number }[];
}

export const shufflePluginKey = new PluginKey<ShufflePluginState>("@pitter-patter/shuffle");

export interface ShufflePluginOptions {
  hoverDecorations?: (from: number, to: number, node: Node) => Decoration | null;
}

/**
 * A ProseMirror plugin factory. Manages decorations, state, and event listeners necessary for
 * autogroup, reorder, and reposition behaviors.
 */
export function shuffle({ hoverDecorations }: ShufflePluginOptions = {}) {
  return new Plugin<ShufflePluginState>({
    key: shufflePluginKey,
    state: {
      init(_, state) {
        const decorations: Decoration[] = [];
        state.doc.descendants((node, pos, _parent, index) => {
          const { shuffleStart, shuffleEnd } = node.attrs;

          if ((shuffleStart === undefined || shuffleEnd === undefined) && !isShuffleRow(node)) {
            return true;
          }

          decorations.push(
            Decoration.node(pos, pos + node.nodeSize, {
              ...(!isShuffleRow(node) && {
                class: `shuffle-block start-${getShuffleGridClass(shuffleStart)} end-${getShuffleGridClass(shuffleEnd)}`,
              }),
              style: `grid-row: ${index + 1}`,
            }),
          );

          return true;
        });

        return {
          deco: DecorationSet.create(state.doc, decorations),
          comp: undefined,
          activeNodePos: undefined,
          hoverPositions: [],
        };
      },
      apply(tr, value, _oldState, newState) {
        const meta = tr.getMeta(shufflePluginKey) as ShufflePluginMeta;
        let nextComp = value.comp;
        let nextHoverPositions = value.hoverPositions;

        if (meta?.type === "hover") {
          nextHoverPositions = meta.payload.positions;
        }

        if (meta?.type === "start") {
          nextComp = randomRef();
        }

        let nextActiveNodePos = value.activeNodePos;
        if (meta?.type === "map") {
          nextActiveNodePos = meta.payload.newPos;
        } else if (meta?.type === "end") {
          nextComp = undefined;
          nextActiveNodePos = undefined;
        } else if (nextActiveNodePos) {
          nextActiveNodePos = tr.mapping.map(nextActiveNodePos);
        }

        const decorations: Decoration[] = [];
        tr.doc.descendants((node, pos, _parent, index) => {
          const { shuffleStart, shuffleEnd } = node.attrs;

          if ((shuffleStart === undefined || shuffleEnd === undefined) && !isShuffleRow(node)) {
            return true;
          }

          decorations.push(
            Decoration.node(pos, pos + node.nodeSize, {
              ...(!isShuffleRow(node) && {
                class: `shuffle-block start-${getShuffleGridClass(shuffleStart)} end-${getShuffleGridClass(shuffleEnd)}`,
              }),
              style: `grid-row: ${index + 1}`,
            }),
          );

          return true;
        });

        if (hoverDecorations) {
          nextHoverPositions.forEach(({ from, to }) => {
            const $from = tr.doc.resolve(from);
            const node = $from.nodeAfter;

            if (!node) return;

            const hoverDeco = hoverDecorations(from, to, node);
            if (hoverDeco) {
              decorations.push(hoverDeco);
            }
          });
        }

        if (nextActiveNodePos !== undefined) {
          const node = newState.doc.resolve(nextActiveNodePos).nodeAfter;

          if (node) {
            decorations.push(
              Decoration.node(
                nextActiveNodePos,
                nextActiveNodePos + node.nodeSize,
                { style: "opacity: 0.4" },
                { shuffleActive: true },
              ),
            );
          }
        }

        return {
          deco: DecorationSet.create(tr.doc, decorations),
          comp: nextComp,
          activeNodePos: nextActiveNodePos,
          hoverPositions: nextHoverPositions,
        };
      },
    },
    appendTransaction(transactions, _oldState, newState) {
      if (
        !transactions.some(
          (tr) => (tr.getMeta(shufflePluginKey) as ShufflePluginMeta | undefined)?.type === "end",
        )
      ) {
        return null;
      }
      const collapsibleRows: [number, Node][] = [];
      newState.doc.descendants((node, pos) => {
        if (isShuffleRow(node) && node.childCount <= 1) {
          collapsibleRows.push([pos, node]);
        }
      });

      const tr = newState.tr;

      for (const [pos, node] of collapsibleRows) {
        tr.replaceWith(tr.mapping.map(pos), tr.mapping.map(pos + node.nodeSize), node.children);
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
        // TODO: Store the event coords so that we can recheck on scroll
        // and view.update
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
          if (viewDesc.contentDOM?.contains(event.target)) return false;

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
        if (!(event.target instanceof HTMLElement)) return;

        if (view.dom.contains(event.target)) return;

        const draggable = event.target.closest("[data-shuffle-inflatable]");

        if (!(draggable instanceof HTMLElement)) return;

        startDragOnPointerDown(view, null, draggable, event.clientX, event.clientY);
      }

      view.root.addEventListener("pointerdown", handleInflatePointerDown as EventListener);

      return {
        destroy() {
          view.root.removeEventListener("pointerdown", handleInflatePointerDown as EventListener);
        },
      };
    },
  });
}

interface WidgetViewDesc {
  widget: Decoration;
}

interface NodeViewDesc {
  node: PmNode;
  dom: HTMLElement;
  contentDOM?: HTMLElement;
  posBefore: number;
}

export function startDragOnPointerDown(
  view: EditorView,
  pos: number | null,
  dom: HTMLElement & { pmViewDesc?: ViewDesc },
  clientX: number,
  clientY: number,
) {
  view.dispatch(
    view.state.tr.setMeta(shufflePluginKey, {
      type: "start",
    } satisfies ShufflePluginMeta),
  );

  const domRect = dom.getBoundingClientRect();

  const domStyle = getComputedStyle(dom);
  const transform = new DOMMatrixReadOnly(domStyle.transform);
  const originX = transform.m41;
  const originY = transform.m42;

  const startX = clientX;
  const startY = clientY;

  const translateCalc = new TranslateCalculator(
    originX,
    originY,
    startX,
    startY,
    domRect,
    parseInt(domStyle.marginTop, 10),
  );

  let clone: HTMLElement | null = null;
  let initialStyles: InitialStyles | null = null;

  let layout: AutoLayout | null = null;
  let currentAnimation: Timeline | null = null;
  let skeletonOn = false;

  const onMove = throttle(function onMove(e: PointerEvent) {
    if (!skeletonOn || !clone || !initialStyles || !layout) {
      const startResult = startDrag(dom!, translateCalc);

      if (pos !== null) {
        view.dispatch(
          view.state.tr.setMeta(shufflePluginKey, {
            type: "map",
            payload: { newPos: pos },
          } satisfies ShufflePluginMeta),
        );
      }

      clone = startResult.clone;
      clone.dataset["shuffleClone"] = "true";
      initialStyles = startResult.initialStyles;

      const gridWrapper = view.dom.closest("[data-shuffle-wrapper]");
      if (!gridWrapper) return;
      const skeleton = gridWrapper.querySelector("[data-shuffle-skeleton]");
      if (!skeleton) return;

      skeletonOn = true;
      animate(skeleton, { opacity: 0.5 }, { duration: 0.25 });
      layout = createLayout(view.dom, { duration: 150 });
    }
    if (!(dom instanceof HTMLElement)) return;

    const { transform, transformOrigin } = translateCalc.slide(e.clientX, e.clientY);

    clone.style.transform = transform;
    clone.style.transformOrigin = transformOrigin;

    const before = shufflePluginKey.getState(view.state)?.activeNodePos;

    if (currentAnimation?.began && !currentAnimation.completed) return;

    const tr = before
      ? (autogroup(view, before, e.clientX, e.clientY) ??
        reorder(view, before, e.clientX, e.clientY) ??
        reposition(view, before, clone.getBoundingClientRect()))
      : inflate(view, clone, e.clientX, e.clientY);

    if (!tr) return;

    currentAnimation = layout.update(() => {
      view.dispatch(tr);
    });

    const updatedBefore = shufflePluginKey.getState(view.state)?.activeNodePos;

    if (updatedBefore === undefined) return;

    const nodeDom = view.nodeDOM(updatedBefore);
    if (nodeDom === dom) return;
    if (!(nodeDom instanceof HTMLElement)) return;

    dom = nodeDom;
    dom.dataset["shuffleActive"] = "true";
  });

  function endDrag(domRect?: DOMRect) {
    if (!clone || !initialStyles) return;

    clone.style.transition = "transform 0.2s ease";
    clone.style.boxShadow = initialStyles.boxShadow;

    const { transform, transformOrigin } = domRect
      ? translateCalc.place(domRect.left, domRect.top)
      : translateCalc.reset();

    clone.style.transform = transform;
    clone.style.transformOrigin = transformOrigin;

    setTimeout(() => {
      clone!.style.transition = "none";
      delete dom.dataset["shuffleActive"];
      clone!.remove();
    }, 250);
  }

  function onUp() {
    document.removeEventListener("mousedown", preventSelection);
    document.removeEventListener("mousedown", preventSelection);
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);

    const gridWrapper = view.dom.closest("[data-shuffle-wrapper]");
    if (!gridWrapper) return;
    const skeleton = gridWrapper.querySelector("[data-shuffle-skeleton]");
    if (!skeleton) return;

    animate(skeleton, { opacity: 0 }, { duration: 0.25 });

    if (!clone || !initialStyles) return;

    if (currentAnimation && currentAnimation.began && !currentAnimation.completed) {
      currentAnimation.complete();
    }

    const before = shufflePluginKey.getState(view.state)?.activeNodePos;

    if (before === undefined) return endDrag();

    const dom = view.nodeDOM(before);
    if (!(dom instanceof HTMLElement)) return endDrag();

    view.dispatch(
      view.state.tr.setMeta(shufflePluginKey, {
        type: "end",
      } satisfies ShufflePluginMeta),
    );

    const domRect = dom.getBoundingClientRect();

    return endDrag(domRect);
  }

  const preventSelection = (e: MouseEvent) => {
    e.preventDefault();
  };

  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
  document.addEventListener("mousedown", preventSelection);
  document.addEventListener("mousemove", preventSelection);

  return true;
}

export type ViewDesc = NodeViewDesc & WidgetViewDesc;

interface InitialStyles {
  boxShadow: string;
}

function startDrag(dom: HTMLElement, translateCalc: TranslateCalculator) {
  const domRect = dom.getBoundingClientRect();
  const bodyRect = document.body.getBoundingClientRect();

  const clone = dom.cloneNode(true) as HTMLElement;

  let cloneQueue: Element[] = [clone];
  let domQueue: Element[] = [dom];

  while (cloneQueue.length && domQueue.length) {
    const domElement = domQueue.pop();
    const cloneElement = cloneQueue.pop();

    if (!(domElement instanceof HTMLElement && cloneElement instanceof HTMLElement)) {
      continue;
    }

    const domStyles = getComputedStyle(domElement);
    for (let i = 0; i < domStyles.length; i++) {
      const property = domStyles.item(i);
      cloneElement.style.setProperty(property, domStyles.getPropertyValue(property));
    }

    cloneQueue.push(...cloneElement.children);
    domQueue.push(...domElement.children);
  }

  clone.style.position = "absolute";
  clone.style.top = `${domRect.top - bodyRect.top}px`;
  clone.style.left = `${domRect.left - bodyRect.left}px`;
  document.body.appendChild(clone);

  dom.dataset["shuffleActive"] = "true";

  const initialBoxShadow = dom.style.boxShadow;

  clone.style.transition = "transform 0.1s ease";
  const { transform, transformOrigin } = translateCalc.slide(
    translateCalc.startX,
    translateCalc.startY,
  );

  clone.style.transform = transform;
  clone.style.transformOrigin = transformOrigin;
  clone.style.boxShadow = "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)";
  clone.style.zIndex = "100";

  setTimeout(() => {
    clone.style.transition = "none";
  }, 100);

  return {
    clone,
    initialStyles: {
      boxShadow: initialBoxShadow,
    } satisfies InitialStyles,
  };
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
