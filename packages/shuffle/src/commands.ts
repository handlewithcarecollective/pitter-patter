import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

import { shufflePluginKey, ShufflePluginMeta } from "./plugin";
import { ShuffleAlignment } from "./schema.js";

export function setShuffleColumns(pos: number, start: number, end: number) {
  return function setShuffleColumnsCommand(state: EditorState, dispatch?: EditorView["dispatch"]) {
    if (!dispatch) return true;

    const tr = state.tr;
    tr.setNodeAttribute(pos, "shuffleStart", start);
    tr.setNodeAttribute(pos, "shuffleEnd", end);
    tr.setMeta(shufflePluginKey, {
      type: "resize",
      payload: { pos, start, end },
    } satisfies ShufflePluginMeta);
    tr.setMeta("composition", shufflePluginKey.getState(state)?.comp);
    dispatch(tr);
    return true;
  };
}

export function setShuffleZIndex(pos: number, zIndex: number) {
  return function setShuffleZIndexCommand(state: EditorState, dispatch?: EditorView["dispatch"]) {
    if (!dispatch) return true;

    const tr = state.tr;
    tr.setNodeAttribute(pos, "zIndex", zIndex);
    tr.setMeta("composition", shufflePluginKey.getState(state)?.comp);
    dispatch(tr);
    return true;
  };
}

export function setShuffleAlignment(pos: number, alignment: ShuffleAlignment) {
  return function setShuffleAlignmentCommand(
    state: EditorState,
    dispatch?: EditorView["dispatch"],
  ) {
    if (!dispatch) return true;

    const tr = state.tr;
    tr.setNodeAttribute(pos, "alignment", alignment);
    tr.setMeta("composition", shufflePluginKey.getState(state)?.comp);
    dispatch(tr);
    return true;
  };
}
