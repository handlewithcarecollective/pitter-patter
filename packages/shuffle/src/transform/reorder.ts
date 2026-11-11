import { reactKeys } from "@handlewithcare/react-prosemirror";
import { NodeType, ResolvedPos } from "prosemirror-model";
import { Transaction } from "prosemirror-state";
import { insertPoint } from "prosemirror-transform";
import { EditorView } from "prosemirror-view";

import { shufflePluginKey, ShufflePluginMeta } from "../plugin.ts";
import { getBeforeContainedBy, isShuffleRow, } from "../schema.ts";

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

  const fromDom = view.nodeDOM(from);
  if (!(fromDom instanceof Element)) return null;
  if (contains(fromDom.getBoundingClientRect(), clientX, clientY)) {
    return null;
  }

  // If hovering over our own placeholder, swap with it
  const placeholder = view.dom.querySelector("[data-shuffle-placeholder]");
  if (placeholder && contains(placeholder.getBoundingClientRect(), clientX, clientY)) {
    const placeholderPos = shufflePluginKey.getState(view.state)?.placeholderPos;
    if (placeholderPos !== undefined) {
      const tr = view.state.tr;
      tr.delete(from, from + node.nodeSize);

      const newPos = tr.mapping.map(placeholderPos);

      tr.insert(newPos, node);

      tr.setMeta(reactKeys().spec.key!, {
        overrides: { [from]: newPos },
      });
      tr.setMeta(shufflePluginKey, {
        type: "map",
        payload: { newPos, oldRect: fromDom.getBoundingClientRect() },
      } satisfies ShufflePluginMeta);
      tr.setMeta("composition", shufflePluginKey.getState(view.state)?.comp);
      return tr;
    }
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

  if (gap === null) return null;

  if (gap <= from + node.nodeSize && gap >= from) return null;

  const $gap = view.state.doc.resolve(gap);
  if ($gap.parent === $from.parent && isShuffleRow($gap.parent)) {
    return null;
  }

  const tr = view.state.tr;
  tr.delete(from, from + node.nodeSize);

  const newPos = tr.mapping.map(gap);

  tr.insert(newPos, node);

  tr.setMeta(reactKeys().spec.key!, {
    overrides: { [from]: newPos },
  });
  tr.setMeta(shufflePluginKey, {
    type: "map",
    payload: { newPos, oldRect: fromDom.getBoundingClientRect() },
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
): number | null {
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

  const candidateNode = view.nodeDOM(candidateStart);
  if (!(candidateNode instanceof Element)) return null;

  const candidateRect = candidateNode.getBoundingClientRect();

  const fromNode = from === null ? from : view.nodeDOM(from);
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
 * it is one of the two blocks adjacent to the gap.
 */
function findCandidate($pos: ResolvedPos, inside: number): number | null {
  if ($pos.parent.inlineContent) {
    let d = $pos.depth;
    while (d > 0 && !$pos.node(d).isBlock) {
      d--;
    }
    return d === 0 ? null : $pos.before(d);
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
