import { Node } from "prosemirror-model";
import { EditorView } from "prosemirror-view";

import { shufflePluginKey } from "../plugin.ts";

import { findGap } from "./reorder.ts";

export function inflate(view: EditorView, clone: HTMLElement, clientX: number, clientY: number) {
  const editorRect = view.dom.getBoundingClientRect();

  if (
    clientX < editorRect.left ||
    clientX > editorRect.right ||
    clientY < editorRect.top ||
    clientY > editorRect.bottom
  ) {
    return null;
  }

  const nodeJSON = clone.dataset["shuffleInflatable"];

  if (!nodeJSON) return null;

  const node = Node.fromJSON(view.state.schema, JSON.parse(nodeJSON));

  const posResult = view.posAtCoords({ left: clientX, top: clientY });
  if (!posResult) return null;

  const { pos } = posResult;

  const gap = findGap(view, pos, node.type, null, clientX, clientY);
  if (gap === null) return null;

  if (!node) return null;

  const tr = view.state.tr;

  tr.insert(gap, node);

  tr.setMeta(shufflePluginKey, {
    type: "map",
    payload: { newPos: gap },
  });

  tr.setMeta("composition", shufflePluginKey.getState(view.state)?.comp);

  return tr;
}
