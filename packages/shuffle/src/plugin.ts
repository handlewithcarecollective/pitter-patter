import { BoundingBox } from "motion";
import { animate } from "motion/mini";
import { Node as PmNode } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

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
      apply(tr, value) {
        const next = value.map(tr.mapping, tr.doc);

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

          const clone = dom.cloneNode(true) as HTMLElement;
          parent.appendChild(clone);

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
          );

          const initialBoxShadow = dom.style.boxShadow;
          const initialZIndex = parent.style.zIndex;

          parent.style.perspective = "80cm";
          parent.style.zIndex = "100";

          clone.style.transition = "transform 0.1s ease";
          clone.style.transform = translateCalc.calculate(startX, startY);
          clone.style.boxShadow =
            "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)";

          setTimeout(() => {
            clone.style.transition = "none";
          }, 100);

          let skeletonOn = false;
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

            clone.style.transform = translateCalc.calculate(
              e.clientX,
              e.clientY,
            );

            const posResult = view.posAtCoords({
              left: e.clientX,
              top: e.clientY,
            });
            if (!posResult) return;
            const domResult = view.domAtPos(posResult.pos);

            const overDom = domResult.node;
            if (!(overDom instanceof HTMLElement)) return;

            const overRect = overDom.getBoundingClientRect();
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
            clone.style.zIndex = initialZIndex;
            clone.style.transform = "none";

            setTimeout(() => {
              clone.style.transition = "none";
              if (parent) {
                parent.style.perspective = "none";
                parent.style.zIndex = initialZIndex;
              }
              dom.style.opacity = initialOpacity;
              clone.remove();
            }, 200);

            return;
          }

          document.addEventListener("pointermove", onMove);
          document.addEventListener("pointerup", onUp);

          return false;
        },
        dragend(view) {
          const gridWrapper = view.dom.closest("[data-pp-grid-wrapper]");
          if (!gridWrapper) return false;
          const skeleton = gridWrapper.querySelector("[data-pp-grid-skeleton]");
          if (!skeleton) return false;

          animate(skeleton, { opacity: 0 }, { duration: 0.25 });

          return false;
        },
      },
    },
    view(view) {
      const gridWrapper = view.dom.closest("[data-pp-grid-wrapper]");
      if (!gridWrapper) return {};

      const bars = gridWrapper.querySelectorAll("[data-pp-grid-skeleton-bar]");

      return {};
    },
  });
}

interface ViewDesc {
  node: PmNode;
  dom: HTMLElement;
  contentDOM?: HTMLElement;
}

const LIFT_AMOUNT = 8;

class TranslateCalculator {
  constructor(
    private originX: number,
    private originY: number,
    private startX: number,
    private startY: number,
  ) {}

  calculate(x: number, y: number) {
    const dx = x - this.startX;
    const dy = y - this.startY;
    return `rotateX(15deg) translate(${this.originX + dx}px, ${this.originY + dy - LIFT_AMOUNT}px)`;
  }
}
