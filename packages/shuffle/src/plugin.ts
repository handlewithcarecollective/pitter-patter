import { randomRef } from "@pitter-patter/refs";
import throttle from "raf-throttle";
import { createLayout, Timeline } from "animejs";
import { animate } from "motion/mini";
import { Node as PmNode } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { reorder } from "./transform/reorder";
import { reposition } from "./transform/reposition";

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

export const shufflePluginKey = new PluginKey<ShufflePluginState>(
  "@pitter-patter/shuffle",
);

export function shuffle() {
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
              class: `pp-shuffle-block start-${shuffleStart} end-${shuffleEnd}`,
            }),
          );

          return true;
        });

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
        }

        if (meta?.type === "end") {
          nextComp = undefined;
          nextActiveNodePos = undefined;
        }

        let nextDeco = value.deco.map(tr.mapping, tr.doc);
        if (meta?.type === "resize") {
          const { pos, start, end } = meta.payload;

          const node = oldState.doc.resolve(pos).nodeAfter;

          if (node) {
            const candidates = nextDeco.find(
              pos,
              pos,
              (spec) => !spec.shuffleActive,
            );
            const decoration = candidates.find(
              (deco) => deco.from === pos && deco.to === pos + node.nodeSize,
            );
            if (decoration) {
              nextDeco = nextDeco.remove([decoration]).add(tr.doc, [
                Decoration.node(pos, pos + node.nodeSize, {
                  class: `pp-shuffle-block start-${start} end-${end}`,
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

          const existing = nextDeco.find(
            pos,
            pos + node.nodeSize,
            (spec) => !spec.shuffleActive,
          );

          if (
            existing.some(
              (deco) => deco.from === pos && deco.to === pos + node.nodeSize,
            )
          ) {
            return true;
          }

          decorations.push(
            Decoration.node(pos, pos + node.nodeSize, {
              class: `pp-shuffle-block start-${shuffleStart} end-${shuffleEnd}`,
            }),
          );

          return true;
        });

        return {
          deco: nextDeco.add(tr.doc, decorations),
          comp: nextComp,
          activeNodePos: nextActiveNodePos,
        };
      },
    },
    props: {
      decorations(state) {
        return shufflePluginKey.getState(state)?.deco;
      },
      attributes: {
        class: "pp-shuffle-block  start-left end-right",
      },
      handleDOMEvents: {
        dragstart(_, event) {
          event.preventDefault();
        },
        pointerdown(view, event) {
          if (!view.editable) return false;
          if (!(event.target instanceof HTMLElement)) return false;

          let dom: null | HTMLElement = event.target;
          while (
            dom &&
            dom !== view.dom &&
            "pmViewDesc" in dom &&
            !(dom as HTMLElement & { pmViewDesc: ViewDesc }).pmViewDesc.node
              ?.type.spec.pitterPatter?.isShuffleBlock
          ) {
            dom = dom.parentElement;
          }

          if (!dom || dom === view.dom) return false;

          const viewDesc = (dom as HTMLElement & { pmViewDesc: ViewDesc })
            .pmViewDesc;

          if (viewDesc.contentDOM?.contains(event.target)) return false;

          view.dispatch(
            view.state.tr.setMeta(shufflePluginKey, {
              type: "start",
            } satisfies ShufflePluginMeta),
          );

          const domRect = dom.getBoundingClientRect();

          const transform = new DOMMatrixReadOnly(
            getComputedStyle(dom).transform,
          );
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
          );

          let clone: HTMLElement | null = null;
          let initialStyles: InitialStyles | null = null;

          const layout = createLayout(view.dom);
          let currentAnimation: Timeline | null = null;
          let skeletonOn = false;
          const onMove = throttle(function onMove(e: PointerEvent) {
            if (!skeletonOn || !clone || !initialStyles) {
              const startResult = startDrag(dom!, translateCalc);

              view.dispatch(
                view.state.tr.setMeta(shufflePluginKey, {
                  type: "map",
                  payload: { newPos: viewDesc.posBefore },
                }),
              );

              clone = startResult.clone;
              initialStyles = startResult.initialStyles;

              const gridWrapper = view.dom.closest("[data-pp-grid-wrapper]");
              if (!gridWrapper) return;
              const skeleton = gridWrapper.querySelector(
                "[data-pp-grid-skeleton]",
              );
              if (!skeleton) return;

              skeletonOn = true;
              animate(skeleton, { opacity: 0.5 }, { duration: 0.25 });
            }
            if (!(dom instanceof HTMLElement)) return;

            clone.style.transform = translateCalc.slide(e.clientX, e.clientY);

            const before = shufflePluginKey.getState(view.state)?.activeNodePos;

            if (before === undefined) return;

            const tr =
              reposition(view, before, clone!.getBoundingClientRect()) ??
              reorder(view, before, e.clientX, e.clientY);

            if (!tr) return;

            if (
              currentAnimation &&
              currentAnimation.began &&
              !currentAnimation.completed
            ) {
              currentAnimation.complete();
            }

            currentAnimation = layout.update(() => {
              view.dispatch(tr);
            });

            const updatedBefore = shufflePluginKey.getState(
              view.state,
            )?.activeNodePos;

            if (updatedBefore === undefined) return;

            const nodeDom = view.nodeDOM(updatedBefore);
            if (nodeDom === dom) return;
            if (!(nodeDom instanceof HTMLElement)) return;

            dom = nodeDom;
            dom.dataset["shuffleDragged"] = "true";
          });

          function onUp() {
            document.removeEventListener("pointermove", onMove);
            document.removeEventListener("pointerup", onUp);

            const gridWrapper = view.dom.closest("[data-pp-grid-wrapper]");
            if (!gridWrapper) return;
            const skeleton = gridWrapper.querySelector(
              "[data-pp-grid-skeleton]",
            );
            if (!skeleton) return;

            animate(skeleton, { opacity: 0 }, { duration: 0.25 });

            if (!clone || !initialStyles) return;

            if (
              currentAnimation &&
              currentAnimation.began &&
              !currentAnimation.completed
            ) {
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

            clone.style.transform = translateCalc.place(
              domRect.left,
              domRect.top,
            );

            setTimeout(() => {
              clone!.style.transition = "none";
              delete dom.dataset["shuffleDragged"];
              clone!.remove();
            }, 250);

            return;
          }

          document.addEventListener("pointermove", onMove);
          document.addEventListener("pointerup", onUp);

          event.preventDefault();
          return true;
        },
      },
    },
  });
}

interface ViewDesc {
  node: PmNode;
  dom: HTMLElement;
  contentDOM?: HTMLElement;
  posBefore: number;
}

const LIFT_AMOUNT = 24;

class TranslateCalculator {
  constructor(
    private originX: number,
    private originY: number,
    public startX: number,
    public startY: number,
    private rect: DOMRect,
  ) {}

  slide(x: number, y: number) {
    const dx = x - this.startX;
    const dy = y - this.startY;
    return `rotateX(0) scale(1.05) translate(${this.originX + dx}px, ${this.originY + dy - LIFT_AMOUNT}px)`;
  }

  place(x: number, y: number) {
    const offsetX = this.rect.x - this.startX;
    const offsetY = this.rect.y - this.startY;

    const dx = x - this.startX - offsetX;
    const dy = y - this.startY - offsetY;

    return `rotateX(0) scale(1) translate(${this.originX + dx}px, ${this.originY + dy}px)`;
  }
}

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

  dom.dataset["shuffleDragged"] = "true";

  const initialBoxShadow = dom.style.boxShadow;

  document.body.style.perspective = "80cm";

  clone.style.transition = "transform 0.1s ease";
  clone.style.transform = translateCalc.slide(
    translateCalc.startX,
    translateCalc.startY,
  );
  clone.style.boxShadow =
    "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)";
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
