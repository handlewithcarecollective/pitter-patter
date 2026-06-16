import { reactKeys } from "@handlewithcare/react-prosemirror";
import { Transaction } from "prosemirror-state";
import { findWrapping } from "prosemirror-transform";
import { EditorView } from "prosemirror-view";

import { shufflePluginKey, ShufflePluginMeta } from "../plugin.ts";
import { getShuffleRowType, isShuffleRow } from "../schema.ts";

export function autogroup(
  view: EditorView,
  from: number,
  clientX: number,
  clientY: number,
): Transaction | null {
  const rowType = getShuffleRowType(view.state.schema);
  if (!rowType) return null;

  const node = view.state.doc.resolve(from).nodeAfter;
  if (!node) return null;

  if (node.type.spec.pitterPatter?.shuffle?.containedBy) return null;

  const adjacentElements = findAdjacentElements(clientY, view.dom.getBoundingClientRect()).filter(
    (el) => !el.dataset["shuffleActive"] && el !== view.dom,
  );

  const adjacentPmDoms = adjacentElements
    .reverse()
    .filter(
      (el) =>
        "pmViewDesc" in el &&
        typeof el.pmViewDesc === "object" &&
        el.pmViewDesc &&
        "node" in el.pmViewDesc &&
        el.pmViewDesc.node &&
        el !== view.dom,
    );

  if (!adjacentPmDoms.length) return null;

  // Nodes that the pointer is outside of. Check these first, and only
  // fall back to nodes that the pointer is inside if we can't use
  // any of these
  const outsidePmDoms = adjacentPmDoms.filter((el) => {
    const rect = el.getBoundingClientRect();
    return (
      clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom
    );
  });

  const outsidePositions = outsidePmDoms.map((el) => view.posAtDOM(el, 0, 1));

  const $outsidePositions = outsidePositions
    .map((pos) => view.state.doc.resolve(pos - 1))
    // Start with nodes at lower depth (higher in the document) first
    .sort(($a, $b) => $a.depth - $b.depth);

  for (const $pos of $outsidePositions) {
    // Skip nodes that are already within rows, reorder will handle those
    if (isShuffleRow($pos.parent)) return null;
    const adjacentNode = $pos.nodeAfter;
    if (!adjacentNode || isShuffleRow(adjacentNode)) return null;

    const blockRange = $pos.blockRange(view.state.doc.resolve($pos.pos + adjacentNode.nodeSize));

    if (!blockRange) continue;

    const wrapping = findWrapping(blockRange, rowType, {
      shuffleStart: $pos.parent.attrs["shuffleStart"] ?? 0,
      shuffleEnd: $pos.parent.attrs["shuffleEnd"] ?? 13,
    });

    if (!wrapping) continue;

    const { tr } = view.state;
    tr.wrap(blockRange, wrapping);

    const gap = $pos.pos + 1;

    tr.delete(tr.mapping.map(from), tr.mapping.map(from + node.nodeSize));

    const newPos = tr.mapping.map(gap) - 1;

    tr.insert(newPos, node);

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

  // TODO: Check insidePmDoms
  return null;
}

function findAdjacentElements(clientY: number, rect: DOMRect) {
  const seen = new Set<HTMLElement>();
  const step = 5;

  for (let x = rect.left; x <= rect.right; x += step) {
    document
      .elementsFromPoint(x, clientY)
      .filter((el) => el instanceof HTMLElement)
      .forEach((el) => seen.add(el));
  }

  return Array.from(seen);
}
