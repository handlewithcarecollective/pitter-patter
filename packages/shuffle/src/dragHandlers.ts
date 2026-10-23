import { AutoLayout, Timeline, createLayout } from "animejs";
import { animate } from "motion/mini";
import { Selection, NodeSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import throttle from "raf-throttle";

import { ShufflePluginMeta, shufflePluginKey } from "./plugin.ts";
import { AutoScroller, ScrollCalculator } from "./scroll.ts";
import { autogroup } from "./transform/autogroup.ts";
import { inflate } from "./transform/inflate.ts";
import { reorder } from "./transform/reorder.ts";
import { reposition } from "./transform/reposition.ts";
import { TranslateCalculator } from "./translation.ts";
import { ViewDesc } from "./viewDesc.ts";

const LAYOUT_DURATION = 150;
const LAYOUT_EASE = "inOut(3.5)";

/**
 * Whether a layout timeline is still tweening the DOM (so it can't be
 * measured). A timeline that hasn't completed but is paused is finished from
 * our point of view; anime never marks an empty one (a transform that moved
 * nothing visually, e.g. reordering within a row whose grid columns fix the
 * layout) as `completed` (??).
 */
function isAnimating(timeline: Timeline | null): timeline is Timeline {
  return timeline !== null && !timeline.completed && !timeline.paused;
}

export function startDragOnPointerDown(
  view: EditorView,
  pos: number | null,
  dom: HTMLElement & { pmViewDesc?: ViewDesc },
  clientX: number,
  clientY: number,
) {
  const startDragInContentDOM =
    shufflePluginKey.getState(view.state)?.startDragInContentDOM ?? false;

  const { selection } = view.state;
  const preserveSelection = selection instanceof NodeSelection && selection.from === pos;

  const startTr = view.state.tr;

  startTr.setMeta(shufflePluginKey, {
    type: "start",
  } satisfies ShufflePluginMeta);

  if (pos !== null) {
    startTr.setSelection(NodeSelection.create(view.state.doc, pos));
  }

  view.dispatch(startTr);
  view.root.shuffleDragging = true;

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

  const scrollCalc = new ScrollCalculator();

  const autoScroller = new AutoScroller();

  let clone: HTMLElement | null = null;
  let initialStyles: InitialStyles | null = null;

  let layout: AutoLayout | null = null;
  let currentAnimation: Timeline | null = null;
  let skeletonOn = false;

  let pendingMoveTimer: ReturnType<typeof setTimeout> | null = null;

  function rerunMove() {
    pendingMoveTimer = null;
    move(translateCalc.lastSlideX, translateCalc.lastSlideY);
  }

  function move(x: number, y: number) {
    if (!clone || !layout) return;
    if (!(dom instanceof HTMLElement)) return;

    const { transform, transformOrigin } = translateCalc.slide(x, y);

    clone.style.transform = transform;
    clone.style.transformOrigin = transformOrigin;

    const before = shufflePluginKey.getState(view.state)?.activeNodePos;

    if (isAnimating(currentAnimation)) {
      // Mid-animation the DOM is in FLIP positions and can't be measured. If
      // the pointer then comes to rest, no further event would re-evaluate
      // this position, so schedule a re-run for when the animation is done.
      if (pendingMoveTimer === null) {
        pendingMoveTimer = setTimeout(rerunMove, 40);
      }
      return;
    }

    // Drive the transforms from where the clone visually is rather than from
    // the pointer.
    const cloneRect = clone.getBoundingClientRect();
    const centerX = cloneRect.left + cloneRect.width / 2;
    const centerY = cloneRect.top + cloneRect.height / 2;

    const tr =
      before != null
        ? (reposition(view, before, cloneRect) ??
          autogroup(view, before, centerX, centerY) ??
          reorder(view, before, centerX, centerY))
        : inflate(view, clone, centerX, centerY);

    if (!tr) return;

    currentAnimation = layout.update(() => {
      view.dispatch(tr);
    });

    if (pendingMoveTimer === null) {
      pendingMoveTimer = setTimeout(rerunMove, 40);
    }

    const updatedBefore = shufflePluginKey.getState(view.state)?.activeNodePos;

    if (updatedBefore === undefined) return;

    const nodeDom = view.nodeDOM(updatedBefore);
    if (nodeDom === dom) return;
    if (!(nodeDom instanceof HTMLElement)) return;

    dom = nodeDom;
    dom.dataset["shuffleActive"] = "true";
  }

  const onMove = throttle(function onMove(e: PointerEvent) {
    if (!skeletonOn || !clone || !initialStyles || !layout) {
      const startResult = startDrag(dom!, translateCalc);

      if (pos !== null) {
        view.dispatch(
          view.state.tr.setMeta(shufflePluginKey, {
            type: "map",
            payload: { newPos: pos, oldRect: undefined },
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
      layout = createLayout(view.dom, { duration: LAYOUT_DURATION, ease: LAYOUT_EASE });
    }

    autoScroller.start(dom, e.clientX, e.clientY);

    move(e.clientX, e.clientY);
  });

  function endDrag(domRect?: DOMRect) {
    if (!clone || !initialStyles) {
      if (startDragInContentDOM && !preserveSelection) {
        const result = view.posAtCoords({ left: clientX, top: clientY });
        if (result) {
          view.dispatch(
            view.state.tr.setSelection(Selection.near(view.state.doc.resolve(result.pos))),
          );
        }
      }
      return;
    }

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
    view.root.removeEventListener("mousedown", preventSelection);
    view.root.removeEventListener("mousemove", preventSelection);
    (view.root as Document).removeEventListener("pointermove", onMove);
    view.root.removeEventListener("pointerup", onUp);
    view.root.removeEventListener("scroll", onScroll, { capture: true });

    autoScroller.stop();
    if (pendingMoveTimer !== null) {
      clearTimeout(pendingMoveTimer);
      pendingMoveTimer = null;
    }

    view.root.shuffleDragging = false;

    const gridWrapper = view.dom.closest("[data-shuffle-wrapper]");
    if (!gridWrapper) return;
    const skeleton = gridWrapper.querySelector("[data-shuffle-skeleton]");
    if (!skeleton) return;

    animate(skeleton, { opacity: 0 }, { duration: 0.25 });

    if (!clone || !initialStyles) return endDrag();

    if (isAnimating(currentAnimation)) {
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

  const preventSelection = (e: Event) => {
    e.preventDefault();
  };

  function onScroll() {
    const { x, y } = scrollCalc.diff();
    translateCalc.scroll(x, y);
    move(translateCalc.lastSlideX, translateCalc.lastSlideY);
  }

  view.root.addEventListener("pointerup", onUp);
  (view.root as Document).addEventListener("pointermove", onMove);
  view.root.addEventListener("mousedown", preventSelection);
  view.root.addEventListener("mousemove", preventSelection);
  // Scroll events don't bubble, so listen in the capture phase to also see
  // scrolling of nested scroll containers, not just the window.
  view.root.addEventListener("scroll", onScroll, { capture: true });

  return true;
}

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
    cloneElement.style.pointerEvents = "none";

    cloneQueue.push(...cloneElement.children);
    domQueue.push(...domElement.children);
  }

  clone.dataset["shuffleClone"] = "true";
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
