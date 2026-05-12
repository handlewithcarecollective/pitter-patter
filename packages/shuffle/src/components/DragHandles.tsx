import {
  useEditorEffect,
  useEditorEventCallback,
  useEditorState,
} from "@handlewithcare/react-prosemirror";
import { Node } from "prosemirror-model";
import {
  ComponentType,
  EventHandler,
  useMemo,
  PointerEvent as SyntheticPointerEvent,
  useState,
} from "react";

import { shufflePluginKey, startDragOnPointerDown, ViewDesc } from "../plugin.js";

interface Props {
  handleComponent?: ComponentType<{
    style: { top: number; left: number };
    onPointerDown: EventHandler<SyntheticPointerEvent>;
    node: Node;
  }>;
}

export function DragHandles({ handleComponent }: Props) {
  const editorState = useEditorState();

  const shuffleState = shufflePluginKey.getState(editorState);

  const hoverPositions = shuffleState?.hoverPositions ?? [];

  return (
    <>
      {hoverPositions.map(({ from }) => (
        <DragHandle key={from} pos={from} handleComponent={handleComponent} />
      ))}
    </>
  );
}

interface DragHandleProps {
  pos: number;
  handleComponent?: Props["handleComponent"];
}

export function DragHandle({ pos, handleComponent: Handle }: DragHandleProps) {
  const [left, setLeft] = useState(0);
  const [top, setTop] = useState(0);

  const editorState = useEditorState();

  const node = useMemo(() => editorState.doc.resolve(pos).nodeAfter, [editorState.doc, pos]);

  useEditorEffect(
    (view) => {
      const nodeDOM = view.nodeDOM(pos);
      if (!(nodeDOM instanceof HTMLElement)) return;
      const nodeRect = nodeDOM.getBoundingClientRect();
      const wrapperDOM = view.dom.closest("[data-shuffle-wrapper]");
      const offsetRect = wrapperDOM?.getBoundingClientRect();
      const offsetLeft = offsetRect?.left ?? 0;
      const offsetTop = offsetRect?.top ?? 0;

      setLeft(nodeRect.left - offsetLeft);
      setTop(nodeRect.top - offsetTop);
    },
    [pos, node],
  );

  const handlePointerDown = useEditorEventCallback((view, event: SyntheticPointerEvent) => {
    const dom = view.nodeDOM(pos);
    startDragOnPointerDown(
      view,
      pos,
      dom as HTMLElement & { pmViewDesc?: ViewDesc },
      event.clientX,
      event.clientY,
    );
  });

  if (!node) return;

  if (Handle) {
    return <Handle style={{ top, left }} node={node} onPointerDown={handlePointerDown} />;
  }

  return (
    <button
      className="shuffle-drag-handle"
      style={{ top, left }}
      draggable="false"
      onPointerDown={handlePointerDown}
    >
      {node.type.name}
    </button>
  );
}
