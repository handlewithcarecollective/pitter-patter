import { EditorView } from "prosemirror-view";
import { setShuffleColumns } from "../commands";

export function resize(
  view: EditorView,
  pos: number,
  side: "start" | "end",
  clientX: number,
): boolean {
  const gridWrapper = view.dom.closest("[data-pp-grid-wrapper]");
  if (!gridWrapper) return false;

  const bars = gridWrapper.querySelectorAll("[data-pp-grid-skeleton-bar]");

  let closestBar: null | number = null;
  let closestDistance: null | number = null;
  for (let i = 0; i < bars.length; i++) {
    const bar = bars.item(i);
    const barRect = bar.getBoundingClientRect();
    const distance = Math.abs(clientX - barRect.left);
    if (closestBar === null || closestDistance === null) {
      closestBar = i;
      closestDistance = Math.abs(clientX - barRect.left);
      continue;
    }
    if (closestDistance > distance) {
      closestBar = i;
      closestDistance = distance;
    }
  }
  if (closestBar === null) return false;
  const $before = view.state.doc.resolve(pos);
  const node = $before.nodeAfter;
  if (!node) return false;

  const { shuffleStart, shuffleEnd } = node.attrs;
  if (typeof shuffleStart !== "number" || typeof shuffleEnd !== "number") {
    return false;
  }

  if (side === "start") {
    const newStart = Math.max(0, closestBar + 1);
    return setShuffleColumns(
      pos,
      newStart,
      shuffleEnd,
    )(view.state, view.dispatch);
  }

  const newEnd = Math.max(0, closestBar);
  return setShuffleColumns(
    pos,
    shuffleStart,
    newEnd,
  )(view.state, view.dispatch);
}
