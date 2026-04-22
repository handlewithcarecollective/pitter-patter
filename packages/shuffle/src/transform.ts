import { reactKeys } from "@handlewithcare/react-prosemirror";
import { EditorView } from "prosemirror-view";
import { setShuffleColumns } from "./commands";
import { shufflePluginKey, ShufflePluginMeta } from "./plugin";
import { Transaction } from "prosemirror-state";

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

export function reorder(
  view: EditorView,
  from: number,
  clientX: number,
  clientY: number,
): Transaction | null {
  const node = view.state.doc.resolve(from).nodeAfter;
  if (!node) return null;

  const elements = document
    .elementsFromPoint(clientX, clientY)
    // The top element is _always_ the drag clone, so we can slice that off
    .slice(1)
    .filter((el) => el instanceof HTMLElement && !el.dataset["shuffleDragged"]);

  const firstPmDom = elements.find(
    (el) => "pmViewDesc" in el || el === view.dom,
  );

  if (!firstPmDom) return null;

  if (firstPmDom === view.dom) {
    const posResult = view.posAtCoords({ left: clientX, top: clientY });
    if (!posResult) return null;

    const posCoords = view.coordsAtPos(posResult.pos);

    const $pos = view.state.doc.resolve(posResult.pos);

    const gap = posCoords.bottom < clientY ? $pos.after(1) : $pos.before(1);

    if (gap === from + node.nodeSize || gap === from) return null;

    const tr = view.state.tr;
    tr.delete(from, from + node.nodeSize);

    const $from = tr.doc.resolve(from);

    if (
      $from.parent.type.spec.pitterPatter?.isShuffleContainer &&
      $from.parent.childCount < 2
    ) {
      tr.replaceWith(
        $from.before(),
        $from.before() + $from.parent.nodeSize,
        $from.parent.children,
      );
    }

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

  // const posResult = view.posAtCoords({ left: clientX, top: clientY });
  // if (!posResult) return null;
  // const { pos: closestPos, inside } = posResult;
  // // TODO: Detect when before first child. inside is 0
  // // in this case
  // if (inside === -1) {
  //   const $closestPos = view.state.doc.resolve(closestPos);
  //   const to = $closestPos.before(1);
  //   const positions: number[] = [];
  //   view.state.doc.forEach((_node, offset) => {
  //     positions.push(offset);
  //   });
  //   const indices = positions.map((_, i) => i);
  //   const fromIndex = positions.indexOf(from);

  //   if (fromIndex === -1) {
  //     const tr = view.state.tr;
  //     const movedNode = view.state.doc.resolve(from).nodeAfter;
  //     if (!movedNode) return null;

  //     tr.delete(from, from + movedNode.nodeSize);

  //     const newPos = tr.mapping.map(to);

  //     tr.insert(tr.mapping.map(to), movedNode);

  //     tr.setMeta(reactKeys().spec.key!, {
  //       overrides: { [from]: newPos },
  //     });
  //     tr.setMeta(shufflePluginKey, {
  //       type: "map",
  //       payload: { newPos },
  //     } satisfies ShufflePluginMeta);
  //     tr.setMeta("composition", shufflePluginKey.getState(view.state)?.comp);

  //     view.dispatch(tr);
  //     return true;
  //   }

  //   const toIndex = positions.indexOf(to);
  //   const order = [...indices];
  //   order.splice(fromIndex, 1);
  //   if (to > positions[positions.length - 1]!) {
  //     order.push(fromIndex);
  //   } else {
  //     order.splice(fromIndex < toIndex ? toIndex - 1 : toIndex, 0, fromIndex);
  //   }

  //   reorderSiblings(0, order)(
  //     view.state,
  //     (tr) => {
  //       tr.setMeta("composition", shufflePluginKey.getState(view.state)?.comp);
  //       view.dispatch(tr);
  //     },
  //     view,
  //   );
  //   return true;
  // }

  return null;
}

export function reposition(
  view: EditorView,
  before: number,
  rect: DOMRect,
): Transaction | null {
  const gridWrapper = view.dom.closest("[data-pp-grid-wrapper]");
  if (!gridWrapper) return null;

  const bars = gridWrapper.querySelectorAll("[data-pp-grid-skeleton-bar]");

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
