import {
  useEditorEffect,
  useEditorEventCallback,
  useEditorStateSelector,
} from "@handlewithcare/react-prosemirror";
import { sentenceCase } from "change-case";
import { Node } from "prosemirror-model";
import { NodeSelection } from "prosemirror-state";
import {
  ComponentType,
  EventHandler,
  MouseEvent,
  PointerEvent as SyntheticPointerEvent,
  useMemo,
  useState,
} from "react";

import { shufflePluginKey, startDragOnPointerDown, ViewDesc } from "../plugin.ts";

const EMPTY: { from: number; to: number }[] = [];

type Offsets = {
  left: number;
  top: number;
} | null;

export interface DragHandleProps {
  style: { top: number; left: number; zIndex: number };
  onPointerDown: EventHandler<SyntheticPointerEvent>;
  onMouseEnter: EventHandler<MouseEvent>;
  onMouseLeave: EventHandler<MouseEvent>;
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

    return shuffleState?.hoverPositions ?? EMPTY;
  });

  const hoverStarts = useMemo(
    () => hoverPositions.map(({ from }) => from).toSorted((a, b) => a - b),
    [hoverPositions],
  );

  const [hoverOffsets, setHoverOffsets] = useState<Offsets[]>([]);

  useEditorEffect(
    (view) => {
      const wrapperDOM = view.dom.closest("[data-shuffle-wrapper]");
      const offsetRect = wrapperDOM?.getBoundingClientRect();

      function computeOffsets(p: number) {
        const nodeDOM = view.nodeDOM(p);
        if (!(nodeDOM instanceof HTMLElement)) return null;
        const nodeRect = nodeDOM.getBoundingClientRect();
        const offsetLeft = offsetRect?.left ?? 0;
        const offsetTop = offsetRect?.top ?? 0;
        return { left: nodeRect.left - offsetLeft, top: nodeRect.top - offsetTop };
      }

      const offsets: Offsets[] = [];

      for (const pos of hoverStarts) {
        const o = computeOffsets(pos);
        const lastO = offsets.at(-1);
        offsets.push(o);
        if (!lastO || !o) continue;

        if (lastO.top > o.top + 8 || lastO.top < o.top - 8) continue;
        if (lastO.left > o.left + 8 || lastO.left < o.left - 8) continue;

        o.left += 32;
      }

      setHoverOffsets(offsets);
    },
    [hoverStarts],
  );

  return (
    <>
      {hoverStarts.map((pos, index) => (
        <DragHandleRenderer
          key={pos}
          pos={pos}
          left={hoverOffsets[index]?.left ?? 0}
          top={hoverOffsets[index]?.top ?? 0}
          handleComponent={handleComponent}
        />
      ))}
    </>
  );
}

interface DragHandleRendererProps {
  pos: number;
  left: number;
  top: number;
  handleComponent?: ComponentType<DragHandleProps> | undefined;
}

export function DragHandleRenderer({
  pos,
  left,
  top,
  handleComponent: Handle,
}: DragHandleRendererProps) {
  const node = useEditorStateSelector((state) => state.doc.nodeAt(pos));

  const initialZIndex = useEditorStateSelector((state) => state.doc.resolve(pos).depth + 10_000);

  const [hovered, setHovered] = useState(false);

  const zIndex = hovered ? 11_000 : initialZIndex;

  const handlePointerDown = useEditorEventCallback((view, event: SyntheticPointerEvent) => {
    view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, pos)));

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
    return (
      <Handle
        style={{ top, left, zIndex }}
        node={node}
        onPointerDown={handlePointerDown}
        onMouseEnter={() => {
          setHovered(true);
        }}
        onMouseLeave={() => {
          setHovered(false);
        }}
      />
    );
  }

  return (
    <DragHandle
      style={{ top, left, zIndex }}
      onPointerDown={handlePointerDown}
      node={node}
      onMouseEnter={() => {
        setHovered(true);
      }}
      onMouseLeave={() => {
        setHovered(false);
      }}
    />
  );
}

export function DragHandle(props: DragHandleProps) {
  const { style, node, onPointerDown, onMouseEnter, onMouseLeave } = props;
  return (
    <button
      type="button"
      className="shuffle-drag-handle"
      style={style}
      draggable="false"
      onPointerDown={onPointerDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {sentenceCase(node.type.name)}
    </button>
  );
}
