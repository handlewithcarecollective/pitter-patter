import { reactKeys } from "@handlewithcare/react-prosemirror";
import { Node, NodeType } from "prosemirror-model";
import { Transaction } from "prosemirror-state";
import { insertPoint } from "prosemirror-transform";
import { EditorView } from "prosemirror-view";

import { shufflePluginKey, ShufflePluginMeta } from "../plugin";

export function reorder(
  view: EditorView,
  from: number,
  clientX: number,
  clientY: number,
): Transaction | null {
  const node = view.state.doc.resolve(from).nodeAfter;
  if (!node) return null;

  const posResult = view.posAtCoords({ left: clientX, top: clientY });
  if (!posResult) return null;

  const { pos } = posResult;

  const gap = findGap(view.state.doc, pos, node.type);

  if (gap === null) return null;

  if (gap === from + node.nodeSize || gap === from) return null;

  const tr = view.state.tr;
  tr.delete(from, from + node.nodeSize);

  const newPos = tr.mapping.map(gap);

  tr.insert(tr.mapping.map(gap), node);

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

function findGap(doc: Node, pos: number, nodeType: NodeType) {
  const $pos = doc.resolve(pos);

  let d = $pos.depth;
  while (!$pos.node(d).isTextblock && d > 0) {
    d--;
  }

  const start = d === 0 ? pos : $pos.before(d);

  const gap = start ? insertPoint(doc, start, nodeType) : start;

  return gap;
}
