import { createLayout } from "animejs";
import { animate } from "motion/mini";
import { Node as PmNode } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { reorder, reposition } from "./transform";

export const shufflePluginKey = new PluginKey("@pitter-patter/shuffle");

export function shuffle() {
  return new Plugin({
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

        return DecorationSet.create(state.doc, decorations);
      },
      apply(tr, value, oldState) {
        let next = value.map(tr.mapping, tr.doc);
        const meta = tr.getMeta(shufflePluginKey);
        if (meta) {
          const { pos, start, end } = meta as {
            pos: number;
            start: number;
            end: number;
          };

          const node = oldState.doc.resolve(pos).nodeAfter;

          if (node) {
            const candidates = next.find(pos, pos);
            const decoration = candidates.find(
              (deco) => deco.from === pos && deco.to === pos + node.nodeSize,
            );
            if (decoration) {
              next = next.remove([decoration]).add(tr.doc, [
                Decoration.node(pos, pos + node.nodeSize, {
                  class: `pp-shuffle-block start-${start} end-${end}`,
                }),
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

          const existing = next.find(pos, pos + node.nodeSize);
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

        return next.add(tr.doc, decorations);
      },
    },
    props: {
      decorations(state) {
        return shufflePluginKey.getState(state);
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
              ?.type.spec.pitterPatter?.isGridBlock
          ) {
            dom = dom.parentElement;
          }

          if (!dom || dom === view.dom) return false;
          const parent = dom.parentElement;
          if (!parent) return false;

          const viewDesc = (dom as HTMLElement & { pmViewDesc: ViewDesc })
            .pmViewDesc;

          if (viewDesc.contentDOM?.contains(event.target)) return false;

          const domRect = dom.getBoundingClientRect();
          const bodyRect = document.body.getBoundingClientRect();

          const clone = dom.cloneNode(true) as HTMLElement;
          clone.style.position = "absolute";
          clone.style.top = `${domRect.top - bodyRect.top}px`;
          clone.style.left = `${domRect.left - bodyRect.left}px`;
          clone.style.width = `${domRect.width}px`;
          clone.style.height = `${domRect.height}px`;
          document.body.appendChild(clone);

          const initialOpacity = dom.style.opacity;
          dom.style.opacity = "40%";

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

          const initialBoxShadow = dom.style.boxShadow;
          const initialZIndex = parent.style.zIndex;

          document.body.style.perspective = "80cm";

          clone.style.transition = "transform 0.1s ease";
          clone.style.transform = translateCalc.slide(startX, startY);
          clone.style.boxShadow =
            "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)";
          clone.style.zIndex = "100";

          setTimeout(() => {
            clone.style.transition = "none";
          }, 100);

          let skeletonOn = false;
          // TODO: debounce with requestAnimationFrame
          // TODO: group all reorders and repositions into one history item
          function onMove(e: PointerEvent) {
            if (!skeletonOn) {
              const gridWrapper = view.dom.closest("[data-pp-grid-wrapper]");
              if (!gridWrapper) return;
              const skeleton = gridWrapper.querySelector(
                "[data-pp-grid-skeleton]",
              );
              if (!skeleton) return;

              animate(skeleton, { opacity: 0.5 }, { duration: 0.25 });
            }
            if (!(dom instanceof HTMLElement)) return;

            clone.style.transform = translateCalc.slide(e.clientX, e.clientY);

            const layout = createLayout(view.dom);
            layout.update(() => {
              reposition(
                view,
                viewDesc.posBefore,
                clone.getBoundingClientRect(),
              );
              reorder(view, viewDesc.posBefore, e.clientX, e.clientY);
            });
          }

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

            if (!(dom instanceof HTMLElement)) return;

            clone.style.transition = "transform 0.2s ease";
            clone.style.boxShadow = initialBoxShadow;

            const domRect = dom.getBoundingClientRect();

            clone.style.transform = translateCalc.place(
              domRect.left,
              domRect.top,
            );

            setTimeout(() => {
              clone.style.transition = "none";
              if (parent) {
                parent.style.perspective = "none";
                clone.style.zIndex = initialZIndex;
              }
              dom.style.opacity = initialOpacity;
              clone.remove();
            }, 250);

            return;
          }

          document.addEventListener("pointermove", onMove);
          document.addEventListener("pointerup", onUp);

          return false;
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
    private startX: number,
    private startY: number,
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
