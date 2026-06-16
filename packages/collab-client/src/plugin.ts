import {
  collab as base,
  collabKey as baseKey,
  CollabState as BaseCollabState,
} from "@stepwisehq/prosemirror-collab-commit/collab-commit";
import { Plugin, PluginKey } from "prosemirror-state";
import { Mappable } from "prosemirror-transform";

export interface StepMap {
  version: number;
  mappables: Mappable[];
}

type CollabState = BaseCollabState & {
  stepMaps: StepMap[];
};

export const collabKey = baseKey as unknown as PluginKey<CollabState>;

export function collab(config: Parameters<typeof base>[0]) {
  const baseSpec = base(config).spec;
  return new Plugin({
    key: collabKey,
    state: {
      init(...args) {
        const baseState = baseSpec.state!.init(...args) as CollabState;
        baseState.stepMaps = [];
        return baseState;
      },
      apply(tr, value, ...args) {
        const next = baseSpec.state!.apply(tr, value, ...args) as CollabState;
        next.stepMaps ??= [...value.stepMaps];
        if (!tr.docChanged && value.version === next.version) return next;

        const lastMap = next.stepMaps[next.stepMaps.length - 1];

        if (lastMap?.version !== next.version) {
          next.stepMaps.push({
            version: next.version,
            mappables: tr.steps.map((step) => step.getMap()),
          });

          return next;
        }

        lastMap.mappables.push(...tr.steps.map((step) => step.getMap()));

        return next;
      },
    },
    historyPreserveItems: true,
  });
}
