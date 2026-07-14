import { reactKeys } from "@handlewithcare/react-prosemirror";
import { EditorState, Transaction } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

import { setShuffleColumns } from "../commands.ts";
import { shufflePluginKey } from "../plugin.ts";

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

  const parentStart = $before.start();
  const beforeParent = parentStart - 1;

  const parent = $before.parent;

  if (parent.type.spec.pitterPatter?.shuffle?.role !== "row") {
    return transaction;
  }

  // setShuffleColumns doesn't change any positions in the doc
  // so we can safely use a position from before the transaction
  const starts = transaction.doc
    .nodeAt(beforeParent)!
    .children!.map((child) => child.attrs["shuffleStart"]);
  const order = transaction.doc
    .nodeAt(beforeParent)!
    .children!.map((_, index) => index)
    .toSorted((a, b) => starts[a]! - starts[b]!);

  reorderSiblingsOnTransaction(
    parentStart,
    order,
    transaction,
    view.state.apply(transaction),
    (tr) => {
      transaction = tr;
    },
  );

  const newPos = transaction.getMeta(reactKeys().spec.key!)!.overrides[before];

  transaction.setMeta(shufflePluginKey, {
    type: "map",
    payload: { newPos },
  });

  return transaction;
}

// This is copied from React ProseMirror. I don't
// really feel like we should export this, as it's
// not really a command, but in this case we do need
// this version of it, not the command
function reorderSiblingsOnTransaction(
  pos: number,
  order: number[],
  tr: Transaction,
  state: EditorState,
  dispatch: (tr: Transaction) => void,
) {
  const orderLookup = order.reduce<number[]>((acc, oldIndex, newIndex) => {
    acc[oldIndex] = newIndex;
    return acc;
  }, []);
  const $pos = state.doc.resolve(pos);
  if ($pos.start() !== pos) {
    return false;
  }
  if (!dispatch) return true;
  const nodes = $pos.parent.children;
  const reordered = nodes
    .map((node, i) => [node, i] as const)
    .sort((param, param1) => {
      let [, a] = param,
        [, b] = param1;
      return orderLookup[a]! - orderLookup[b]!;
    })
    .map((param) => {
      let [node] = param;
      return node;
    });
  tr.replaceWith(pos, $pos.parent.content.size + pos, reordered);
  const meta: { overrides: Record<number, number> } = {
    overrides: {},
  };
  const oldPositions = [];
  let start = pos;
  for (const node of nodes) {
    oldPositions.push(start);
    start += node.nodeSize;
  }
  start = pos;
  const newPositions: number[] = [];
  for (let i = 0; i < reordered.length; i++) {
    const node = reordered[i];
    newPositions[order[i]!] = start;
    start += node!.nodeSize;
  }
  for (let i = 0; i < oldPositions.length; i++) {
    const oldPosition = oldPositions[i]!;
    const newPosition = newPositions[i]!;
    meta.overrides[oldPosition] = newPosition;
  }
  tr.setMeta(reactKeys().spec.key!, meta);
  dispatch(tr);
  return true;
}
