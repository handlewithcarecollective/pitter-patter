import { reactKeys } from "@handlewithcare/react-prosemirror";
import { Fragment, NodeType, ResolvedPos } from "prosemirror-model";
import { Transaction } from "prosemirror-state";
import { findWrapping, insertPoint } from "prosemirror-transform";
import { EditorView } from "prosemirror-view";

import { shufflePluginKey, ShufflePluginMeta } from "../plugin.ts";
import { getBeforeContainedBy, getShuffleRowType, isShuffleRow, supportsDrag } from "../schema.ts";

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

  // `posAtCoords` is unreliable over a non-editable atom.
  // the browser reports the nearest *editable* position,
  // which may be in an unrelated block.
  const fromDom = view.nodeDOM(from);
  if (
    fromDom instanceof HTMLElement &&
    contains(fromDom.getBoundingClientRect(), clientX, clientY)
  ) {
    return null;
  }

  const posResult = view.posAtCoords({ left: clientX, top: clientY });
  if (!posResult) return null;

  const { pos } = posResult;

  if (posResult.inside === from) return null;

  if (
    $containedBy &&
    (pos <= $containedBy.pos ||
      pos >=
        $containedBy.pos + ($containedBy.doc.nodeAt($containedBy.pos) ?? $containedBy.doc).nodeSize)
  ) {
    return null;
  }

  if (pos < from + node.nodeSize && pos > from) return null;

  const gap = findGap(view, pos, node.type, from, clientX, clientY, posResult.inside);

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
  inside = -1,
): number | Transaction | null {
  const { doc } = view.state;
  const $pos = doc.resolve(pos);

  if (
    $pos.parentOffset == $pos.parent.content.size &&
    $pos.parent.canReplaceWith($pos.index(), $pos.index(), nodeType)
  ) {
    return pos;
  }

  const candidateStart = findCandidate($pos, inside);
  if (candidateStart === null) return null;
  if (candidateStart === from) return null;

  const candidate = doc.nodeAt(candidateStart);
  if (!candidate) return null;

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
    !isShuffleRow(candidate) &&
    fromRect &&
    candidateRect.top <= fromRect.bottom &&
    candidateRect.bottom >= fromRect.top;

  // `posAtCoords` can resolve to content nowhere near the pointer (e.g. the
  // nearest editable text when the pointer is over a non-editable atom). Only
  // act on a candidate the pointer is actually over or in the spacing beside,
  // measured along the axis the candidate's siblings are laid out on.
  const nearby = horizontal
    ? clientX >= candidateRect.left - CANDIDATE_SLACK &&
      clientX <= candidateRect.right + CANDIDATE_SLACK
    : clientY >= candidateRect.top - CANDIDATE_SLACK &&
      clientY <= candidateRect.bottom + CANDIDATE_SLACK;
  if (!nearby) return null;

  if (from !== null && isInCenter(candidateRect, clientX, clientY, horizontal ?? false)) {
    const grouped = autogroup(view, doc.resolve(candidateStart), from);
    if (grouped) return grouped;
  }

  const isInFirstHalf = horizontal
    ? clientX < (candidateRect.left + candidateRect.right) / 2
    : clientY < (candidateRect.top + candidateRect.bottom) / 2;

  const candidateGap = isInFirstHalf ? candidateStart : candidateStart + candidate.nodeSize;

  if (candidateGap === 0) return 0;

  return insertPoint(doc, candidateGap, nodeType);
}

/**
 * Picks the block the pointer should be considered "over", given the position
 * `posAtCoords` resolved to, and returns the position directly before it.
 *
 * Inside a textblock, that's the textblock itself (or its nearest block
 * ancestor when the position sits inside an inline node with content).
 *
 * Otherwise the position is a gap between block children. When the pointer is
 * over a draggable parent's own chrome, that parent is the candidate; otherwise
 * it is one of the two blocks adjacent to the gap, never the parent: prefer
 * whichever one the pointer is actually inside (per `inside`), then the block
 * after the gap, then the block before it.
 */
function findCandidate($pos: ResolvedPos, inside: number): number | null {
  if ($pos.parent.inlineContent) {
    let d = $pos.depth;
    while (d > 0 && !$pos.node(d).isBlock) {
      d--;
    }
    return d === 0 ? null : $pos.before(d);
  }

  // The pointer is over the parent block's own chrome rather than any child
  // (e.g. the picture of an image block whose content is its caption), so
  // `posAtCoords` landed at an edge of the parent's content. The parent is the
  // block being hovered. Rows are the exception: the pointer between a row's
  // children is targeting those children.
  if (
    $pos.depth > 0 &&
    inside === $pos.before() &&
    supportsDrag($pos.parent) &&
    !isShuffleRow($pos.parent)
  ) {
    return $pos.before();
  }

  const { nodeBefore, nodeAfter } = $pos;
  const beforeStart = nodeBefore ? $pos.pos - nodeBefore.nodeSize : null;

  if (beforeStart !== null && inside === beforeStart) return beforeStart;
  if (nodeAfter && inside === $pos.pos) return $pos.pos;
  if (nodeAfter) return $pos.pos;
  return beforeStart;
}

/**
 * How far (px) past a candidate block's edge, along its layout axis, the
 * pointer may be and still count as hovering it (covers the spacing between
 * blocks).
 */
const CANDIDATE_SLACK = 60;

function contains(rect: DOMRect, clientX: number, clientY: number) {
  return (
    clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
  );
}

/**
 * The widest the center band (the zone that triggers an autogroup rather than
 * a reorder) may extend to either side of a block's midpoint, in pixels.
 */
const CENTER_BAND = 30;

/**
 * Whether the pointer is in the block's center band. The band is capped at
 * the middle third of the block so short blocks (headings, buttons, list
 * items) always keep a reorder zone at their leading and trailing edges.
 */
function isInCenter(rect: DOMRect, clientX: number, clientY: number, horizontal: boolean) {
  if (horizontal) {
    const mid = (rect.left + rect.right) / 2;
    const half = Math.min(CENTER_BAND, rect.width / 6);
    return clientX > mid - half && clientX < mid + half;
  }

  const mid = (rect.top + rect.bottom) / 2;
  const half = Math.min(CENTER_BAND, rect.height / 6);
  return clientY > mid - half && clientY < mid + half;
}

function autogroup(view: EditorView, $pos: ResolvedPos, from: number): Transaction | null {
  const rowType = getShuffleRowType(view.state.schema);
  if (!rowType) return null;

  const node = $pos.doc.nodeAt(from);
  // Rows don't nest: dragging a row over another block's center reorders it.
  if (!node || isShuffleRow(node)) return null;

  const candidate = $pos.doc.nodeAt($pos.pos);
  if (!candidate || isShuffleRow(candidate)) return null;

  if (!rowType.validContent(Fragment.from([node, candidate]))) return null;

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
    payload: { newPos },
  } satisfies ShufflePluginMeta);
  tr.setMeta("composition", shufflePluginKey.getState(view.state)?.comp);

  return tr;
}
