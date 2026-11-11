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
    payload: { pos },
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

    const cloneRect = clone.getBoundingClientRect();

    const tr =
      before != null
        ? (reposition(view, before, cloneRect) ??
          autogroup(view, before, x, y) ??
          reorder(view, before, x, y))
        : inflate(view, clone, x, y);

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
    if (!skeletonOn || !clone || !layout) {
      clone = startDrag(dom!, translateCalc);

      if (pos !== null) {
        view.dispatch(
          view.state.tr.setMeta(shufflePluginKey, {
            type: "map",
            payload: { newPos: undefined, oldRect: undefined },
          } satisfies ShufflePluginMeta),
        );
      }

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
    view.dispatch(
      view.state.tr.setMeta(shufflePluginKey, {
        type: "end",
      } satisfies ShufflePluginMeta),
    );

    if (!clone) {
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
    const skeleton = gridWrapper?.querySelector("[data-shuffle-skeleton]");

    animate(skeleton, { opacity: 0 }, { duration: 0.25 });

    if (isAnimating(currentAnimation)) {
      currentAnimation.complete();
    }

    const before = shufflePluginKey.getState(view.state)?.activeNodePos;

    if (before === undefined) return endDrag();

    const dom = view.nodeDOM(before);
    if (!(dom instanceof Element)) return endDrag();

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
      const value = domStyles.getPropertyValue(property);
      cloneElement.style.setProperty(property, value);
    }
    if (cloneElement.style.background === "none") {
      cloneElement.style.removeProperty("background");
    }
    cloneElement.style.pointerEvents = "none";

    cloneQueue.push(...cloneElement.children);
    domQueue.push(...domElement.children);
  }

  clone.dataset["shuffleClone"] = "true";
  clone.classList.add("shuffle-clone");
  clone.style.position = "absolute";
  clone.style.top = `${domRect.top - bodyRect.top}px`;
  clone.style.left = `${domRect.left - bodyRect.left}px`;
  clone.style.removeProperty("box-shadow");
  document.body.appendChild(clone);

  dom.dataset["shuffleActive"] = "true";

  clone.style.transition = "transform 0.1s ease";
  const { transform, transformOrigin } = translateCalc.slide(
    translateCalc.startX,
    translateCalc.startY,
  );

  clone.style.transform = transform;
  clone.style.transformOrigin = transformOrigin;
  clone.style.zIndex = "100";

  setTimeout(() => {
    clone.style.transition = "none";
  }, 100);

  return clone;
}
