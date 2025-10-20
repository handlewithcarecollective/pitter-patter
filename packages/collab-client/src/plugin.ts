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
      apply(tr, ...args) {
        const baseState = baseSpec.state!.apply(tr, ...args) as CollabState;
        baseState.stepMaps ??= [];
        const meta = tr.getMeta(collabKey) as BaseCollabState | undefined;
        if (meta?.commit) {
          baseState.stepMaps.push({
            version: meta.commit.version,
            mappables: meta.commit.steps.map((step) => step.getMap()),
          });
        }
        return baseState;
      },
    },
    historyPreserveItems: true,
  });
}
