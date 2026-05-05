import {
  useEditorEffect,
  useEditorEventCallback,
  useEditorState,
} from "@handlewithcare/react-prosemirror";
import { AutoLayout, createLayout, Timeline } from "animejs";
import { animate } from "motion/mini";
import { Node } from "prosemirror-model";
import { NodeSelection } from "prosemirror-state";
import throttle from "raf-throttle";
import { useMemo, useState } from "react";

import { shufflePluginKey, ShufflePluginMeta } from "../plugin";
import { supportsResize } from "../schema";
import { resize } from "../transform/resize";

export function ResizeHandles() {
  const { doc, selection } = useEditorState();

  const firstSelectedShuffleBlock = useMemo(() => {
    if (selection instanceof NodeSelection) {
      return { pos: selection.from, node: selection.node };
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
      const pos = blockRange.$from.before(depth);
      return { pos, node: doc.resolve(pos).nodeAfter! };
    }

    return null;
  }, [selection, doc]);

  if (firstSelectedShuffleBlock === null) return null;

  return (
    <>
      <LeftResizeHandle pos={firstSelectedShuffleBlock.pos} node={firstSelectedShuffleBlock.node} />
      <RightResizeHandle
        pos={firstSelectedShuffleBlock?.pos}
        node={firstSelectedShuffleBlock.node}
      />
    </>
  );
}

interface ResizeHandleProps {
  pos: number;
  node: Node;
}

export function LeftResizeHandle({ pos, node }: ResizeHandleProps) {
  const [left, setLeft] = useState(0);
  const [top, setTop] = useState(0);

  useEditorEffect(
    (view) => {
      const dom = view.nodeDOM(pos);
      if (!(dom instanceof HTMLElement)) return;
      const rect = dom.getBoundingClientRect();
      setLeft(rect.left - 8);
      setTop((rect.bottom + rect.top) / 2);
    },
    [pos, node],
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

export function RightResizeHandle({ pos, node }: ResizeHandleProps) {
  const [left, setLeft] = useState(0);
  const [top, setTop] = useState(0);

  useEditorEffect(
    (view) => {
      const dom = view.nodeDOM(pos);
      if (!(dom instanceof HTMLElement)) return;
      const rect = dom.getBoundingClientRect();
      setLeft(rect.right + 8);
      setTop((rect.top + rect.bottom) / 2);
    },
    [pos, node],
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
  return useEditorEventCallback((view) => {
    if (!view.editable) return;

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
        layout = createLayout(view.dom, { duration: 150 });
        animate(skeleton, { opacity: 0.5 }, { duration: 0.25 });
      }

      if (currentAnimation?.began && !currentAnimation.completed) return;

      const tr = resize(view, pos, side, e.clientX);

      if (!tr) return;

      // This doesn't do anything, at the moment?
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
