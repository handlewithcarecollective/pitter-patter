import {
  useEditorEffect,
  useEditorEventCallback,
  useEditorStateSelector,
} from "@handlewithcare/react-prosemirror";
import { Node } from "prosemirror-model";
import {
  ComponentType,
  EventHandler,
  PointerEvent as SyntheticPointerEvent,
  useState,
} from "react";

import { shufflePluginKey, startDragOnPointerDown, ViewDesc } from "../plugin.ts";

export interface DragHandleProps {
  style: { top: number; left: number };
  onPointerDown: EventHandler<SyntheticPointerEvent>;
  node: Node;
}

/**
 * A React component that renders the drag handles. This component will render a drag handle for each
 * node that the pointer is currently hovering over. It should be a descendant of the `ProseMirror`
 * component. The `handleComponent` prop can be used to provide a custom handle implementation.
 *
 * @example
 *
 * ```tsx
 * function Editor() {
 *   return (
 *     <ProseMirror defaultState={editorState}>
 *       <ShuffleSkeleton>
 *         <ProseMirrorDoc />
 *         <DragHandles />
 *       </ShuffleSkeleton>
 *     </ProseMirror>
 *   );
 * }
 * ```
 */
export function DragHandles(props: { handleComponent?: ComponentType<DragHandleProps> }) {
  const { handleComponent } = props;

  const hoverPositions = useEditorStateSelector((state) => {
    const shuffleState = shufflePluginKey.getState(state);

    return shuffleState?.hoverPositions ?? [];
  });

  return (
    <>
      {hoverPositions.map(({ from }) => (
        <DragHandleRenderer key={from} pos={from} handleComponent={handleComponent} />
      ))}
    </>
  );
}

interface DragHandleRendererProps {
  pos: number;
  handleComponent?: ComponentType<DragHandleProps> | undefined;
}

export function DragHandleRenderer({ pos, handleComponent: Handle }: DragHandleRendererProps) {
  const [left, setLeft] = useState(0);
  const [top, setTop] = useState(0);

  const node = useEditorStateSelector((state) => state.doc.resolve(pos).nodeAfter);

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

  return <DragHandle style={{ top, left }} onPointerDown={handlePointerDown} node={node} />;
}

export function DragHandle(props: DragHandleProps) {
  const { style, node, onPointerDown } = props;
  return (
    <button
      type="button"
      className="shuffle-drag-handle"
      style={style}
      draggable="false"
      onPointerDown={onPointerDown}
    >
      {node.type.name}
    </button>
  );
}
