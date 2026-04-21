import { reorderSiblings } from "@handlewithcare/react-prosemirror";
import { EditorView } from "prosemirror-view";
import { setShuffleColumns } from "./commands";
import { shufflePluginKey } from "./plugin";

export function reorder(
  view: EditorView,
  from: number,
  clientX: number,
  clientY: number,
): boolean {
  const posResult = view.posAtCoords({ left: clientX, top: clientY });
  if (!posResult) return false;
  const { pos: closestPos, inside } = posResult;
  // TODO: Detect when before first child. inside is 0
  // in this case
  if (inside === -1) {
    const $closestPos = view.state.doc.resolve(closestPos);
    const to = $closestPos.before(1);
    const positions: number[] = [];
    view.state.doc.forEach((_node, offset) => {
      positions.push(offset);
    });
    const indices = positions.map((_, i) => i);
    const fromIndex = positions.indexOf(from);
    const toIndex = positions.indexOf(to);
    const order = [...indices];
    order.splice(fromIndex, 1);
    if (to > positions[positions.length - 1]!) {
      order.push(fromIndex);
    } else {
      order.splice(fromIndex < toIndex ? toIndex - 1 : toIndex, 0, fromIndex);
    }

    reorderSiblings(0, order)(
      view.state,
      (tr) => {
        tr.setMeta("composition", shufflePluginKey.getState(view.state)?.comp);
        view.dispatch(tr);
      },
      view,
    );
    return true;
  }
  return false;
  // const $pos = view.state.doc.resolve(pos);
  // let parent = $pos.parent;
  // return !!parent.type.spec.pitterPatter?.isGridContainer;
}

export function reposition(
  view: EditorView,
  before: number,
  rect: DOMRect,
): boolean {
  const gridWrapper = view.dom.closest("[data-pp-grid-wrapper]");
  if (!gridWrapper) return false;

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
  if (closestBar === null) return false;

  const $before = view.state.doc.resolve(before);
  const node = $before.nodeAfter;
  if (!node) return false;

  const { shuffleStart, shuffleEnd } = node.attrs;
  if (typeof shuffleStart !== "number" || typeof shuffleEnd !== "number") {
    return false;
  }

  const diff = shuffleStart - (closestBar + 1);
  if (!diff) return false;

  const newStart = Math.max(0, closestBar + 1);
  const newEnd = Math.min(shuffleEnd - diff, 12);
  if (newStart - newEnd !== shuffleStart - shuffleEnd) return false;

  return setShuffleColumns(before, newStart, newEnd)(view.state, view.dispatch);
}
