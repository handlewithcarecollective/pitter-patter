import { Transaction } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

import { setShuffleColumns } from "../commands";

export function resize(
  view: EditorView,
  pos: number,
  side: "start" | "end",
  clientX: number,
): Transaction | null {
  const gridWrapper = view.dom.closest("[data-shuffle-wrapper]");
  if (!gridWrapper) return null;

  const bars = gridWrapper.querySelectorAll("[data-shuffle-skeleton-bar]");

  let closestBar: null | number = null;
  let closestDistance: null | number = null;
  for (let i = 0; i < bars.length; i++) {
    const bar = bars.item(i);
    const barRect = bar.getBoundingClientRect();
    const barSide = side === "start" ? barRect.left : barRect.right;
    const distance = Math.abs(clientX - barSide);
    if (closestBar === null || closestDistance === null) {
      closestBar = i;
      closestDistance = Math.abs(clientX - barSide);
      continue;
    }
    if (closestDistance > distance) {
      closestBar = i;
      closestDistance = distance;
    }
  }
  if (closestBar === null) return null;
  const $before = view.state.doc.resolve(pos);
  const node = $before.nodeAfter;
  if (!node) return null;

  const { shuffleStart, shuffleEnd } = node.attrs;
  if (typeof shuffleStart !== "number" || typeof shuffleEnd !== "number") {
    return null;
  }

  let transaction!: Transaction;

  if (side === "start") {
    const newStart = Math.max(0, closestBar + 1);
    setShuffleColumns(
      pos,
      newStart,
      shuffleEnd,
    )(view.state, (tr) => {
      transaction = tr;
    });
    return transaction;
  }

  const newEnd = Math.max(0, closestBar + 1);
  setShuffleColumns(
    pos,
    shuffleStart,
    newEnd,
  )(view.state, (tr) => {
    transaction = tr;
  });
  return transaction;
}
