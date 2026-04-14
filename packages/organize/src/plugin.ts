import { BoundingBox } from "motion";
import { animate } from "motion/mini";
import { Node as PmNode } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

export const organizePluginKey = new PluginKey("@pitter-patter/organize");

export function organize() {
  return new Plugin({
    key: organizePluginKey,
    state: {
      init(_, state) {
        const decorations: Decoration[] = [];
        state.doc.descendants((node, pos) => {
          const { orgStart, orgEnd } = node.attrs;

          if (orgStart === undefined || orgEnd === undefined) {
            return true;
          }

          decorations.push(
            Decoration.node(pos, pos + node.nodeSize, {
              class: `pp-org start-${orgStart} end-${orgEnd}`,
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
          const { orgStart, orgEnd } = node.attrs;

          if (orgStart === undefined || orgEnd === undefined) {
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
              class: `pp-org start-${orgStart} end-${orgEnd}`,
            }),
          );

          return true;
        });

        return next.add(tr.doc, decorations);
      },
    },
    props: {
      decorations(state) {
        return organizePluginKey.getState(state);
      },
      attributes: {
        class: "pp-org  start-left end-right",
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
            !dom.pmViewDesc?.node?.type.spec.pitterPatter?.isGridBlock
          ) {
            dom = dom.parentElement;
          }

          if (!dom || dom === view.dom) return false;

          dom.style.zIndex = "100";

          const transform = new DOMMatrixReadOnly(
            getComputedStyle(dom).transform,
          );
          const originX = transform.m41;
          const originY = transform.m42;

          const startX = event.clientX;
          const startY = event.clientY;

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
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            dom.style.transform = `translate(${originX + dx}px, ${originY + dy}px)`;
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

