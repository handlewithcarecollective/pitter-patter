import { widget, WidgetViewComponentProps } from "@handlewithcare/react-prosemirror";
import { AutoLayout, createLayout, Timeline } from "animejs";
import { animate } from "motion/mini";
import { Node, Node as PmNode } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import throttle from "raf-throttle";
import { ComponentType, ForwardRefExoticComponent, RefAttributes } from "react";

import { randomRef } from "@pitter-patter/refs";

import { isShuffleRow, supportsDrag, supportsResize } from "./schema";
import { autogroup } from "./transform/autogroup";
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

export type ShufflePluginMeta =
  | ShufflePluginStartMeta
  | ShufflePluginEndMeta
  | ShufflePluginMapMeta
  | ShufflePluginResizeMeta;

export interface ShufflePluginState {
  deco: DecorationSet;
  comp: string | undefined;
  activeNodePos: number | undefined;
}

export const shufflePluginKey = new PluginKey<ShufflePluginState>("@pitter-patter/shuffle");

export interface ShufflePluginOptions {
  dragHandles?: Record<string, ComponentType<WidgetViewComponentProps>>;
}

export function shuffle({ dragHandles }: ShufflePluginOptions = {}) {
  return new Plugin<ShufflePluginState>({
    key: shufflePluginKey,
    state: {
      init(_, state) {
        const decorations: Decoration[] = [];
        state.doc.descendants((node, pos) => {
          const { shuffleStart, shuffleEnd } = node.attrs;

          if (shuffleStart === undefined || shuffleEnd === undefined) {
            return true;
          }

          decorations.push(
            Decoration.node(pos, pos + node.nodeSize, {
              class: `shuffle-block start-${getShuffleGridClass(shuffleStart)} end-${getShuffleGridClass(shuffleEnd)}`,
            }),
          );

          return true;
        });

        const { $from, $to } = state.selection;

        let d = $from.parent === $to.parent ? $from.depth : $from.blockRange($to)?.depth;

        if (d !== undefined) {
          while (d > 0) {
            const before = $from.before(d);
            const node = $from.node(d);
            const handle = dragHandles?.[node.type.name];
            if (handle) {
              decorations.push(
                widget(
                  before,
                  handle as ForwardRefExoticComponent<
                    RefAttributes<HTMLElement> & WidgetViewComponentProps
                  >,
                  {
                    key: `drag-handle-${d}`,
                    nodePos: before,
                    nodeDepth: d,
                    isDragHandle: true,
                    side: -1,
                  },
                ),
              );
            }
            d--;
          }
        }

        return {
          deco: DecorationSet.create(state.doc, decorations),
          comp: undefined,
          activeNodePos: undefined,
        };
      },
      apply(tr, value, oldState, newState) {
        const meta = tr.getMeta(shufflePluginKey) as ShufflePluginMeta;
        let nextComp = value.comp;

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

        let nextDeco = value.deco.map(tr.mapping, tr.doc);
        if (meta?.type === "resize") {
          const { pos, start, end } = meta.payload;

          const node = oldState.doc.resolve(pos).nodeAfter;

          if (node) {
            const candidates = nextDeco.find(pos, pos, (spec) => !spec.shuffleActive);
            const decoration = candidates.find(
              (deco) => deco.from === pos && deco.to === pos + node.nodeSize,
            );
            if (decoration) {
              nextDeco = nextDeco.remove([decoration]).add(tr.doc, [
                Decoration.node(pos, pos + node.nodeSize, {
                  class: `shuffle-block start-${getShuffleGridClass(start)} end-${getShuffleGridClass(end)}`,
                }),
              ]);
            }
          }
        }

        if (nextActiveNodePos !== value.activeNodePos) {
          if (value.activeNodePos !== undefined) {
            const node = oldState.doc.resolve(value.activeNodePos).nodeAfter;

            if (node) {
              const candidates = nextDeco.find(
                value.activeNodePos,
                value.activeNodePos,
                (spec) => spec.shuffleActive,
              );
              const decoration = candidates.find(
                (deco) =>
                  deco.from === value.activeNodePos &&
                  deco.to === value.activeNodePos + node.nodeSize,
              );
              if (decoration) {
                nextDeco = nextDeco.remove([decoration]);
              }
            }
          }
          if (nextActiveNodePos !== undefined) {
            const node = newState.doc.resolve(nextActiveNodePos).nodeAfter;

            if (node) {
              nextDeco = nextDeco.add(newState.doc, [
                Decoration.node(
                  nextActiveNodePos,
                  nextActiveNodePos + node.nodeSize,
                  { style: "opacity: 0.4" },
                  { shuffleActive: true },
                ),
              ]);
            }
          }
        }

        const decorations: Decoration[] = [];

        tr.doc.descendants((node, pos) => {
          const { shuffleStart, shuffleEnd } = node.attrs;

          if (shuffleStart === undefined || shuffleEnd === undefined) {
            return true;
          }

          const existing = nextDeco.find(pos, pos + node.nodeSize, (spec) => !spec.shuffleActive);

          if (existing.some((deco) => deco.from === pos && deco.to === pos + node.nodeSize)) {
            return true;
          }

          decorations.push(
            Decoration.node(pos, pos + node.nodeSize, {
              class: `shuffle-block start-${getShuffleGridClass(shuffleStart)} end-${getShuffleGridClass(shuffleEnd)}`,
            }),
          );

          return true;
        });

        nextDeco = nextDeco.remove(
          nextDeco.find(undefined, undefined, (spec) => spec.isDragHandle),
        );

        const { $from, $to } = newState.selection;
        let d = $from.parent === $to.parent ? $from.depth : $from.blockRange($to)?.depth;

        if (d !== undefined) {
          while (d > 0) {
            const before = $from.before(d);
            const node = $from.node(d);
            const handle = dragHandles?.[node.type.name];
            if (handle) {
              decorations.push(
                widget(
                  before,
                  handle as ForwardRefExoticComponent<
                    RefAttributes<HTMLElement> & WidgetViewComponentProps
                  >,
                  {
                    key: `drag-handle-${d}`,
                    nodePos: before,
                    nodeDepth: d,
                    isDragHandle: true,
                    side: -1,
                  },
                ),
              );
            }
            d--;
          }
        }

        return {
          deco: nextDeco.add(tr.doc, decorations),
          comp: nextComp,
          activeNodePos: nextActiveNodePos,
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
        pointerdown(view, event) {
          if (!view.editable) return false;
          if (!(event.target instanceof HTMLElement)) return false;

          let dom: null | (HTMLElement & { pmViewDesc?: ViewDesc }) = event.target;

          while (
            dom &&
            dom !== view.dom &&
            !dom.pmViewDesc?.widget?.spec.isDragHandle &&
            !supportsResize(dom.pmViewDesc?.node) &&
            !supportsDrag(dom.pmViewDesc?.node)
          ) {
            dom = dom.parentElement;
          }

          if (!dom || dom === view.dom) return false;

          if (dom.pmViewDesc?.widget) {
            const domPos = dom.pmViewDesc.widget.spec.nodePos;
            dom = view.nodeDOM(domPos) as HTMLElement;
          }

          const viewDesc = dom.pmViewDesc;

          if (viewDesc?.contentDOM?.contains(event.target)) return false;

          view.dispatch(
            view.state.tr.setMeta(shufflePluginKey, {
              type: "start",
            } satisfies ShufflePluginMeta),
          );

          const domRect = dom.getBoundingClientRect();

          const transform = new DOMMatrixReadOnly(getComputedStyle(dom).transform);
          const originX = transform.m41;
          const originY = transform.m42;

          const startX = event.clientX;
          const startY = event.clientY;

          const translateCalc = new TranslateCalculator(
            originX,
            originY,
            startX,
            startY,
            domRect,
            LIFT_AMOUNT,
          );

          let clone: HTMLElement | null = null;
          let initialStyles: InitialStyles | null = null;

          let layout: AutoLayout | null = null;
          let currentAnimation: Timeline | null = null;
          let skeletonOn = false;
          const onMove = throttle(function onMove(e: PointerEvent) {
            if (!skeletonOn || !clone || !initialStyles || !layout) {
              const startResult = startDrag(dom!, translateCalc);

              view.dispatch(
                view.state.tr.setMeta(shufflePluginKey, {
                  type: "map",
                  payload: { newPos: viewDesc?.posBefore },
                }),
              );

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

            clone.style.transform = translateCalc.slide(e.clientX, e.clientY);

            const before = shufflePluginKey.getState(view.state)?.activeNodePos;

            if (before === undefined) return;

            if (currentAnimation?.began && !currentAnimation.completed) return;

            const tr =
              autogroup(view, before, e.clientX, e.clientY) ??
              reorder(view, before, e.clientX, e.clientY) ??
              reposition(view, before, clone!.getBoundingClientRect());

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

            if (before === undefined) return;

            const dom = view.nodeDOM(before);
            if (!(dom instanceof HTMLElement)) return;

            view.dispatch(
              view.state.tr.setMeta(shufflePluginKey, {
                type: "end",
              } satisfies ShufflePluginMeta),
            );

            clone.style.transition = "transform 0.2s ease";
            clone.style.boxShadow = initialStyles.boxShadow;

            const domRect = dom.getBoundingClientRect();

            clone.style.transform = translateCalc.place(domRect.left, domRect.top);

            setTimeout(() => {
              clone!.style.transition = "none";
              delete dom.dataset["shuffleActive"];
              clone!.remove();
            }, 250);

            return;
          }

          const preventSelection = (e: MouseEvent) => {
            e.preventDefault();
          };

          document.addEventListener("pointermove", onMove);
          document.addEventListener("pointerup", onUp);
          document.addEventListener("mousedown", preventSelection);
          document.addEventListener("mousemove", preventSelection);

          return true;
        },
      },
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

export type ViewDesc = NodeViewDesc & WidgetViewDesc;
const LIFT_AMOUNT = 24;

interface InitialStyles {
  boxShadow: string;
}

function startDrag(dom: HTMLElement, translateCalc: TranslateCalculator) {
  const domRect = dom.getBoundingClientRect();
  const bodyRect = document.body.getBoundingClientRect();

  const clone = dom.cloneNode(true) as HTMLElement;
  clone.style.position = "absolute";
  clone.style.top = `${domRect.top - bodyRect.top}px`;
  clone.style.left = `${domRect.left - bodyRect.left}px`;
  clone.style.width = `${domRect.width}px`;
  clone.style.height = `${domRect.height}px`;
  document.body.appendChild(clone);

  dom.dataset["shuffleActive"] = "true";

  const initialBoxShadow = dom.style.boxShadow;

  clone.style.transition = "transform 0.1s ease";
  clone.style.transform = translateCalc.slide(translateCalc.startX, translateCalc.startY);
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
