import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

export const organizePluginKey = new PluginKey("@pitter-patter/organize");

export function organize() {
  return new Plugin({
    key: organizePluginKey,
    state: {
      init(_, state) {
        const decorations: Decoration[] = [];
        state.doc.descendants((node, pos) => {
          const { orgStart, orgEnd } = node.attrs;

          if (orgStart === undefined || orgEnd === undefined) {
            return true;
          }

          decorations.push(
            Decoration.node(pos, pos + node.nodeSize, {
              class: `pp-org start-${orgStart} end-${orgEnd}`,
            }),
          );

          return true;
        });

        return DecorationSet.create(state.doc, decorations);
      },
      apply(tr, value) {
        const next = value.map(tr.mapping, tr.doc);

        const decorations: Decoration[] = [];

        tr.doc.descendants((node, pos) => {
          const { orgStart, orgEnd } = node.attrs;

          if (orgStart === undefined || orgEnd === undefined) {
            return true;
          }

          const existing = next.find(pos, pos + node.nodeSize);
          if (
            existing.some(
              (deco) => deco.from === pos && deco.to === pos + node.nodeSize,
            )
          ) {
            return true;
          }

          decorations.push(
            Decoration.node(pos, pos + node.nodeSize, {
              class: `pp-org start-${orgStart} end-${orgEnd}`,
            }),
          );

          return true;
        });

        return next.add(tr.doc, decorations);
      },
    },
    props: {
      decorations(state) {
        return organizePluginKey.getState(state);
      },
    },
  });
}
