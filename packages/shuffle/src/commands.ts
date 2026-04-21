import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { shufflePluginKey } from "./plugin";

export function setShuffleColumns(pos: number, start: number, end: number) {
  return function setShuffleColumnsCommand(
    state: EditorState,
    dispatch?: EditorView["dispatch"],
  ) {
    if (!dispatch) return true;

    const tr = state.tr;
    tr.setNodeAttribute(pos, "shuffleStart", start);
    tr.setNodeAttribute(pos, "shuffleEnd", end);
    tr.setMeta(shufflePluginKey, { pos, start, end });
    tr.setMeta("composition", shufflePluginKey.getState(state)?.comp);
    dispatch(tr);
    return true;
  };
}
