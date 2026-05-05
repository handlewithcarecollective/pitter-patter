import { Transaction } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

import { setShuffleColumns } from "../commands";

export function reposition(view: EditorView, before: number, rect: DOMRect): Transaction | null {
  const gridWrapper = view.dom.closest("[data-shuffle-wrapper]");
  if (!gridWrapper) return null;

  const bars = gridWrapper.querySelectorAll("[data-shuffle-skeleton-bar]");

  let closestBar: null | number = null;
  let closestDistance: null | number = null;
  for (let i = 0; i < bars.length; i++) {
    const bar = bars.item(i);
    const barRect = bar.getBoundingClientRect();
    const distance = Math.abs(rect.left - barRect.left);
    if (closestBar === null || closestDistance === null) {
      closestBar = i;
      closestDistance = Math.abs(rect.left - barRect.left);
      continue;
    }
    if (closestDistance > distance) {
      closestBar = i;
      closestDistance = distance;
    }
  }
  if (closestBar === null) return null;

  const $before = view.state.doc.resolve(before);
  const node = $before.nodeAfter;
  if (!node) return null;

  const { shuffleStart, shuffleEnd } = node.attrs;
  if (typeof shuffleStart !== "number" || typeof shuffleEnd !== "number") {
    return null;
  }

  const diff = shuffleStart - (closestBar + 1);
  if (!diff) return null;

  const newStart = Math.max(0, closestBar + 1);
  const newEnd = Math.min(shuffleEnd - diff, 12);
  if (newStart - newEnd !== shuffleStart - shuffleEnd) return null;

  let transaction!: Transaction;
  setShuffleColumns(
    before,
    newStart,
    newEnd,
  )(view.state, (tr) => {
    transaction = tr;
  });

  return transaction;
}
