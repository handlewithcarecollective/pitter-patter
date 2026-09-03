import { reactKeys } from "@handlewithcare/react-prosemirror";
import { NodeType } from "prosemirror-model";
import { Transaction } from "prosemirror-state";
import { insertPoint } from "prosemirror-transform";
import { EditorView } from "prosemirror-view";

import { shufflePluginKey, ShufflePluginMeta } from "../plugin.ts";
import { getBeforeContainedBy } from "../schema.ts";

export function reorder(
  view: EditorView,
  from: number,
  clientX: number,
  clientY: number,
): Transaction | null {
  const $from = view.state.doc.resolve(from);

  const node = $from.nodeAfter;
  if (!node) return null;

  const $containedBy = getBeforeContainedBy($from);

  const posResult = view.posAtCoords({ left: clientX, top: clientY });
  if (!posResult) return null;

  const { pos } = posResult;

  if (
    $containedBy &&
    (pos <= $containedBy.pos ||
      pos >= $containedBy.pos + ($containedBy.nodeAfter ?? $containedBy.doc).nodeSize)
  ) {
    return null;
  }

  if (pos <= from + node.nodeSize && pos >= from) return null;

  const gap = findGap(view, pos, node.type, from, clientX, clientY);

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
) {
  const { doc } = view.state;
  const $pos = doc.resolve(pos);

  if ($pos.nodeAfter && $pos.parent.canReplaceWith($pos.index(), $pos.index(), nodeType)) {
    return pos;
  }

  if (
    $pos.parentOffset == $pos.parent.content.size &&
    $pos.parent.canReplaceWith($pos.index(), $pos.index(), nodeType)
  ) {
    return pos;
  }

  let d = $pos.depth;
  while (!$pos.node(d).isBlock && d > 0) {
    d--;
  }

  if (d === 0) return null;

  const candidateStart = $pos.before(d);

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
    fromRect && candidateRect.top <= fromRect.bottom && candidateRect.bottom >= fromRect.top;

  const isInFirstHalf = horizontal
    ? clientX < (candidateRect.left + candidateRect.right) / 2
    : clientY < (candidateRect.top + candidateRect.bottom) / 2;

  const candidateGap = isInFirstHalf ? candidateStart : $pos.after(d);

  if (candidateGap === 0) return 0;

  return insertPoint(doc, candidateGap, nodeType);
}
