import { reactKeys } from "@handlewithcare/react-prosemirror";
import { Transaction } from "prosemirror-state";
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
