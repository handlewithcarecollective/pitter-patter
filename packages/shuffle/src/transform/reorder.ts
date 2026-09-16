import { reactKeys } from "@handlewithcare/react-prosemirror";
import { NodeType, ResolvedPos } from "prosemirror-model";
import { Transaction } from "prosemirror-state";
import { findWrapping, insertPoint } from "prosemirror-transform";
import { EditorView } from "prosemirror-view";

import { shufflePluginKey, ShufflePluginMeta } from "../plugin.ts";
import { getBeforeContainedBy, getShuffleRowType, isShuffleRow } from "../schema.ts";

export function reorder(
  view: EditorView,
  from: number,
  clientX: number,
  clientY: number,
): Transaction | null {
  const $from = view.state.doc.resolve(from);

  const node = $from.doc.nodeAt($from.pos);
  if (!node) return null;

  const $containedBy = getBeforeContainedBy($from);

  const posResult = view.posAtCoords({ left: clientX, top: clientY });
  if (!posResult) return null;

  let { pos } = posResult;

  // The pointer is directly over the node being dragged, so there is nothing
  // to do. This has to be checked via `inside` rather than `pos`: for leaf
  // nodes like images, posAtCoords resolves to a position *adjacent* to the
  // node, which the boundary adjustment below would otherwise mistake for
  // hovering the surrounding row.
  if (posResult.inside === from) return null;

  if ((pos === from || pos === from + node.nodeSize) && $from.depth > 0) {
    pos = $from.before();
  }

  if (
    $containedBy &&
    (pos <= $containedBy.pos ||
      pos >=
        $containedBy.pos + ($containedBy.doc.nodeAt($containedBy.pos) ?? $containedBy.doc).nodeSize)
  ) {
    return null;
  }

  if (pos <= from + node.nodeSize && pos >= from) return null;

  const gap = findGap(view, pos, node.type, from, clientX, clientY);

  if (gap instanceof Transaction) {
    return gap;
  }

  if (gap === null) return null;

  if (gap <= from + node.nodeSize && gap >= from) return null;

  const tr = view.state.tr;
  tr.delete(from, from + node.nodeSize);

  const newPos = tr.mapping.map(gap);

  tr.insert(newPos, node);

  tr.setMeta(reactKeys().spec.key!, {
    overrides: { [from]: newPos },
  });
  tr.setMeta(shufflePluginKey, {
    type: "map",
    payload: { newPos },
  } satisfies ShufflePluginMeta);
  tr.setMeta("composition", shufflePluginKey.getState(view.state)?.comp);

  return tr;
}

export function findGap(
  view: EditorView,
  pos: number,
  nodeType: NodeType,
  from: number | null,
  clientX: number,
  clientY: number,
): number | Transaction | null {
  const { doc } = view.state;
  const $pos = doc.resolve(pos);

  // if ($pos.nodeAfter && $pos.parent.canReplaceWith($pos.index(), $pos.index(), nodeType)) {
  //   console.log(1);
  //   return pos;
  // }

  if (
    $pos.parentOffset == $pos.parent.content.size &&
    $pos.parent.canReplaceWith($pos.index(), $pos.index(), nodeType)
  ) {
    // console.log(2);
    return pos;
  }

  let d = $pos.depth;
  while (!$pos.node(d).isBlock && d > 0) {
    d--;
  }

  const candidateStart = d === 0 ? $pos.pos : $pos.before(d);

  const candidateDom = view.domAtPos(candidateStart, 1);
  if (!(candidateDom.node instanceof Element)) return null;
  const candidateNode = candidateDom.offset
    ? candidateDom.node.childNodes.item(candidateDom.offset)
    : candidateDom.node;
  if (!(candidateNode instanceof Element)) return null;

  const candidateRect = candidateNode.getBoundingClientRect();

  const fromDom = from === null ? from : view.domAtPos(from, 1);
  const fromNode =
    fromDom && (fromDom.offset ? fromDom.node.childNodes.item(fromDom.offset) : fromDom.node);
  if (fromNode !== null && !(fromNode instanceof HTMLElement)) return null;

  const fromRect = fromNode?.getBoundingClientRect();

  const horizontal =
    !isShuffleRow($pos.doc.nodeAt(candidateStart)) &&
    fromRect &&
    candidateRect.top <= fromRect.bottom &&
    candidateRect.bottom >= fromRect.top;

  if (from !== null && isInCenter(candidateRect, clientX, clientY, horizontal ?? false)) {
    return autogroup(view, $pos.doc.resolve(candidateStart), from);
  }

  const isInFirstHalf = horizontal
    ? clientX < (candidateRect.left + candidateRect.right) / 2
    : clientY < (candidateRect.top + candidateRect.bottom) / 2;

  const candidateGap = isInFirstHalf
    ? candidateStart
    : d === 0
      ? $pos.pos + $pos.doc.nodeAt($pos.pos)!.nodeSize
      : $pos.after(d);

  if (candidateGap === 0) return 0;

  return insertPoint(doc, candidateGap, nodeType);
}

function isInCenter(rect: DOMRect, clientX: number, clientY: number, horizontal: boolean) {
  if (horizontal) {
    return (
      clientX > Math.max((rect.left + rect.right) / 2 - 30, rect.left) &&
      clientX < Math.min((rect.left + rect.right) / 2 + 30, rect.right)
    );
  }

  return (
    clientY > Math.max((rect.top + rect.bottom) / 2 - 30, rect.top) &&
    clientY < Math.min((rect.top + rect.bottom) / 2 + 30, rect.bottom)
  );
}

function autogroup(view: EditorView, $pos: ResolvedPos, from: number) {
  const rowType = getShuffleRowType(view.state.schema);
  if (!rowType) return null;

  const node = $pos.doc.nodeAt(from);
  if (!node) return null;

  const candidate = $pos.doc.nodeAt($pos.pos);
  if (!candidate || isShuffleRow(candidate)) return null;

  let d = $pos.depth;
  while (d >= 0) {
    if (isShuffleRow($pos.node(d))) return null;
    d--;
  }

  const blockRange = $pos.blockRange($pos.doc.resolve($pos.pos + candidate.nodeSize));

  if (!blockRange) return null;

  const wrapping = findWrapping(blockRange, rowType, {
    shuffleStart: $pos.parent.attrs["shuffleStart"] ?? 0,
    shuffleEnd: $pos.parent.attrs["shuffleEnd"] ?? 13,
  });

  if (!wrapping) return null;

  const { tr } = view.state;

  tr.wrap(blockRange, wrapping);

  const gap = $pos.pos + 1;

  tr.delete(tr.mapping.map(from), tr.mapping.map(from + node.nodeSize));

  const newPos = tr.mapping.map(gap) - 1;

  tr.insert(newPos, node);

  tr.setMeta(reactKeys().spec.key!, {
    overrides: { [from]: newPos },
  });
  tr.setMeta(shufflePluginKey, {
    type: "map",
    payload: {
      newPos,
      // The dragged node is inserted immediately before the candidate, so the
      // candidate now sits right after it. Keep the candidate where it was on
      // screen
      scrollAnchor: { before: $pos.pos, after: newPos + node.nodeSize },
    },
  } satisfies ShufflePluginMeta);
  tr.setMeta("composition", shufflePluginKey.getState(view.state)?.comp);

  return tr;
}
