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
import {
  ComponentType,
  EventHandler,
  PointerEvent as SyntheticPointerEvent,
  useMemo,
  useState,
} from "react";

import { shufflePluginKey, ShufflePluginMeta } from "../plugin.ts";
import { supportsResize } from "../schema.ts";
import { resize } from "../transform/resize.ts";

/**
 * A React component that renders the resize handles. This component will render a single set of resize
 * handles whenever the selection is within a resizable node. It should be a descendant of the
 * `ProseMirror` component. The `handleComponent` prop can be used to provide a custom handle
 * implementation.
 *
 * @example
 *
 * ```tsx
 * function Editor() {
 *   return (
 *     <ProseMirror defaultState={editorState}>
 *       <ShuffleSkeleton>
 *         <ProseMirrorDoc />
 *         <ResizeHandles />
 *       </ShuffleSkeleton>
 *     </ProseMirror>
 *   );
 * }
 * ```
 */
export function ResizeHandles(props: {
  handleComponent?: ComponentType<{
    style: { top: number; left: number };
    onPointerDown: EventHandler<SyntheticPointerEvent>;
  }>;
}) {
  const { handleComponent } = props;
  const { doc, selection } = useEditorState();

  const firstSelectedShuffleBlock = useMemo(() => {
    if (selection instanceof NodeSelection) {
      return { pos: selection.from, node: selection.node };
    }

    const spansBlock = selection.$from.parent !== selection.$to.parent;

    const blockRange = selection.$from.blockRange(selection.$to)!;

    let node = spansBlock ? blockRange.parent : selection.$from.parent;
    let depth = spansBlock ? blockRange.depth : selection.$from.depth;
    while (depth > 0 && !supportsResize(node)) {
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
      <LeftResizeHandle
        pos={firstSelectedShuffleBlock.pos}
        node={firstSelectedShuffleBlock.node}
        handleComponent={handleComponent}
      />
      <RightResizeHandle
        pos={firstSelectedShuffleBlock?.pos}
        node={firstSelectedShuffleBlock.node}
        handleComponent={handleComponent}
      />
    </>
  );
}

interface ResizeHandleProps {
  pos: number;
  node: Node;
  handleComponent?:
    | ComponentType<{
        style: { top: number; left: number };
        onPointerDown: EventHandler<SyntheticPointerEvent>;
      }>
    | undefined;
}

export function LeftResizeHandle({ pos, node, handleComponent: Handle }: ResizeHandleProps) {
  const [left, setLeft] = useState(0);
  const [top, setTop] = useState(0);

  useEditorEffect(
    (view) => {
      const nodeDOM = view.nodeDOM(pos);
      if (!(nodeDOM instanceof HTMLElement)) return;
      const nodeRect = nodeDOM.getBoundingClientRect();
      // Handles are positioned relative to the shuffle wrapper.
      // There may be more than one shuffle-enabled editor on the page,
      // so find the one that's specifically wrapping this editor.
      const wrapperDOM = view.dom.closest("[data-shuffle-wrapper]");
      const offsetRect = wrapperDOM?.getBoundingClientRect();
      const offsetLeft = offsetRect?.left ?? 0;
      const offsetTop = offsetRect?.top ?? 0;

      setLeft(nodeRect.left - 8 - offsetLeft);
      setTop((nodeRect.bottom + nodeRect.top) / 2 - offsetTop);
    },
    [pos, node],
  );

  const handlePointerDown = useResizeHandlePointerDown(pos, "start");

  if (Handle) {
    return <Handle style={{ top, left }} onPointerDown={handlePointerDown} />;
  }

  return (
    <button
      type="button"
      className="shuffle-left-resize-handle"
      style={{ left, top }}
      onPointerDown={handlePointerDown}
      draggable="false"
    />
  );
}

export function RightResizeHandle({ pos, node, handleComponent: Handle }: ResizeHandleProps) {
  const [left, setLeft] = useState(0);
  const [top, setTop] = useState(0);

  useEditorEffect(
    (view) => {
      const nodeDOM = view.nodeDOM(pos);
      if (!(nodeDOM instanceof HTMLElement)) return;
      const nodeRect = nodeDOM.getBoundingClientRect();
      const wrapperDOM = view.dom.closest("[data-shuffle-wrapper]");
      const offsetRect = wrapperDOM?.getBoundingClientRect();
      const offsetLeft = offsetRect?.left ?? 0;
      const offsetTop = offsetRect?.top ?? 0;

      setLeft(nodeRect.right + 8 - offsetLeft);
      setTop((nodeRect.bottom + nodeRect.top) / 2 - offsetTop);
    },
    [pos, node],
  );
  const handlePointerDown = useResizeHandlePointerDown(pos, "end");

  if (Handle) {
    return <Handle style={{ top, left }} onPointerDown={handlePointerDown} />;
  }

  return (
    <button
      type="button"
      className="shuffle-right-resize-handle"
      style={{ left, top }}
      onPointerDown={handlePointerDown}
      draggable="false"
    />
  );
}

/**
 * A React hook that can be used to build a custom resize handles component. It takes the position of
 * the selected node and whether to create a handler for the start or end handler.
 *
 * It returns an event handler that can be added to the `"pointerdown"` event.
 */
export function useResizeHandlePointerDown(pos: number, side: "start" | "end") {
  return useEditorEventCallback((view) => {
    if (!view.editable) return;

    let layout: AutoLayout | null = null;
    let currentAnimation: Timeline | null = null;
    let skeletonOn = false;
    const handleMove = throttle(function handleMove(e: PointerEvent) {
      if (!skeletonOn || !layout) {
        const gridWrapper = view.dom.closest("[data-shuffle-wrapper]");
        if (!gridWrapper) return;
        const skeleton = gridWrapper.querySelector("[data-shuffle-skeleton]");
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

      const gridWrapper = view.dom.closest("[data-shuffle-wrapper]");
      if (!gridWrapper) return;
      const skeleton = gridWrapper.querySelector("[data-shuffle-skeleton]");
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
