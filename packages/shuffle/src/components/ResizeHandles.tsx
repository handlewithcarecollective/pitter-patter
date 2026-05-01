import {
  useEditorEffect,
  useEditorEventCallback,
  useEditorState,
} from "@handlewithcare/react-prosemirror";
import { AutoLayout, createLayout, Timeline } from "animejs";
import { animate } from "motion/mini";
import { NodeSelection } from "prosemirror-state";
import throttle from "raf-throttle";
import { PointerEvent as ReactPointerEvent, useMemo, useState } from "react";

import { shufflePluginKey, ShufflePluginMeta } from "../plugin";
import { supportsResize } from "../schema";
import { resize } from "../transform/resize";
import { TranslateCalculator } from "../translation.js";

export function ResizeHandles() {
  const { selection } = useEditorState();

  const firstSelectedShuffleBlock = useMemo(() => {
    if (selection instanceof NodeSelection) {
      return selection.from;
    }

    const blockRange = selection.$from.blockRange(selection.$to);

    if (!blockRange) return null;

    let node = blockRange.parent;
    let depth = blockRange.depth;
    while (depth >= 0 && !supportsResize(node)) {
      depth--;
      node = blockRange.$from.node(depth);
    }

    if (supportsResize(node)) {
      return blockRange.$from.before(depth);
    }

    return null;
  }, [selection]);

  if (firstSelectedShuffleBlock === null) return null;

  return (
    <>
      <LeftResizeHandle pos={firstSelectedShuffleBlock} />
      <RightResizeHandle pos={firstSelectedShuffleBlock} />
    </>
  );
}

interface ResizeHandleProps {
  pos: number;
}

export function LeftResizeHandle({ pos }: ResizeHandleProps) {
  const [left, setLeft] = useState(0);
  const [top, setTop] = useState(0);

  useEditorEffect(
    (view) => {
      const node = view.nodeDOM(pos);
      if (!(node instanceof HTMLElement)) return;
      const rect = node.getBoundingClientRect();
      setLeft(rect.left - 8);
      setTop((rect.bottom + rect.top) / 2);
    },
    [pos],
  );

  const handlePointerDown = useHandlePointerDown(pos, "start");

  return (
    <button
      type="button"
      className="left-resize-handle"
      style={{ left, top }}
      onPointerDown={handlePointerDown}
      draggable="false"
    />
  );
}

export function RightResizeHandle({ pos }: ResizeHandleProps) {
  const [left, setLeft] = useState(0);
  const [top, setTop] = useState(0);

  useEditorEffect(
    (view) => {
      const node = view.nodeDOM(pos);
      if (!(node instanceof HTMLElement)) return;
      const rect = node.getBoundingClientRect();
      setLeft(rect.right + 8);
      setTop((rect.top + rect.bottom) / 2);
    },
    [pos],
  );
  const handlePointerDown = useHandlePointerDown(pos, "end");

  return (
    <button
      type="button"
      className="right-resize-handle"
      style={{ left, top }}
      onPointerDown={handlePointerDown}
      draggable="false"
    />
  );
}

function useHandlePointerDown(pos: number, side: "start" | "end") {
  return useEditorEventCallback((view, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!view.editable) return;

    const dom = event.target;
    if (!(dom instanceof HTMLElement)) return;

    const domRect = dom.getBoundingClientRect();

    const transform = new DOMMatrixReadOnly(getComputedStyle(dom).transform);
    const originX = transform.m41;
    const originY = transform.m42;

    const startX = event.clientX;
    const startY = event.clientY;

    const translateCalc = new TranslateCalculator(originX, originY, startX, startY, domRect, 0);

    let layout: AutoLayout | null = null;
    let currentAnimation: Timeline | null = null;
    let skeletonOn = false;
    const handleMove = throttle(function handleMove(e: PointerEvent) {
      if (!skeletonOn || !layout) {
        const gridWrapper = view.dom.closest("[data-pp-grid-wrapper]");
        if (!gridWrapper) return;
        const skeleton = gridWrapper.querySelector("[data-pp-grid-skeleton]");
        if (!skeleton) return;

        skeletonOn = true;
        layout = createLayout(view.dom);
        animate(skeleton, { opacity: 0.5 }, { duration: 0.25 });
      }

      dom.style.transform = translateCalc.slide(e.clientX, e.clientY);

      const tr = resize(view, pos, side, e.clientX);

      if (!tr) return;

      if (currentAnimation && currentAnimation.began && !currentAnimation.completed) {
        currentAnimation.complete();
      }

      currentAnimation = layout.update(() => {
        view.dispatch(tr);
      });
    });

    function handleUp() {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);

      const gridWrapper = view.dom.closest("[data-pp-grid-wrapper]");
      if (!gridWrapper) return;
      const skeleton = gridWrapper.querySelector("[data-pp-grid-skeleton]");
      if (!skeleton) return;

      animate(skeleton, { opacity: 0 }, { duration: 0.25 });

      view.dispatch(
        view.state.tr.setMeta(shufflePluginKey, {
          type: "end",
        } satisfies ShufflePluginMeta),
      );
    }

    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
  });
}
