import {
  useEditorEffect,
  useEditorEventCallback,
  useEditorState,
} from "@handlewithcare/react-prosemirror";
import { createLayout, Timeline } from "animejs";
import { animate } from "motion/mini";
import { NodeSelection } from "prosemirror-state";
import throttle from "raf-throttle";
import { useMemo, useRef, useState } from "react";

import { shufflePluginKey, ShufflePluginMeta } from "../plugin";
import { supportsResize } from "../schema";
import { resize } from "../transform/resize";

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
  const animationRef = useRef<Timeline | null>(null);

  return useEditorEventCallback((view) => {
    if (!view.editable) return;

    let skeletonOn = false;
    const handleMove = throttle(function handleMove(e: PointerEvent) {
      if (!skeletonOn) {
        const gridWrapper = view.dom.closest("[data-pp-grid-wrapper]");
        if (!gridWrapper) return;
        const skeleton = gridWrapper.querySelector("[data-pp-grid-skeleton]");
        if (!skeleton) return;

        skeletonOn = true;
        animate(skeleton, { opacity: 0.5 }, { duration: 0.25 });
      }

      if (animationRef.current && animationRef.current.began && !animationRef.current.completed) {
        animationRef.current.complete();
      }

      const layout = createLayout(view.dom);
      animationRef.current = layout.update(() => {
        resize(view, pos, side, e.clientX);
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
