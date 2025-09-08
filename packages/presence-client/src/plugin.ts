import { widget } from "@handlewithcare/react-prosemirror";
import { collabKey } from "@pitter-patter/collab-client";
import { PluginKey, Plugin, EditorState } from "prosemirror-state";
import { DecorationSet, Decoration } from "prosemirror-view";
import {
  PresenceAnchor,
  getPresenceColor as defaultGetPresenceColor,
} from "./decorations/PresenceAnchor";
import { PresenceIndicator } from "./PresenceIndicator";

export interface PresenceState {
  decorations: DecorationSet;
  indicators: Record<string, PresenceIndicator[]>;
}

export const presenceKey = new PluginKey<PresenceState>(
  "@pitter-patter/presence-client/presence",
);

export function receivePresenceTransaction(
  editorState: EditorState,
  presence: Record<string, PresenceIndicator>,
) {
  return editorState.tr.setMeta(presenceKey, presence);
}

export function presence(
  config: {
    getPresenceColor?: (userId: string) => string;
  } = {},
) {
  const getPresenceColor = config.getPresenceColor ?? defaultGetPresenceColor;
  return new Plugin<PresenceState>({
    key: presenceKey,
    state: {
      init() {
        return {
          decorations: DecorationSet.empty,
          indicators: {},
        };
      },
      apply(tr, { decorations, indicators }, _oldState, editorState) {
        const collabState = collabKey.getState(editorState);
        if (!collabState) return { decorations, indicators };

        const nextIndicators = { ...indicators };

        const incoming = tr.getMeta(presenceKey) as
          | Record<string, PresenceIndicator>
          | undefined;

        if (incoming) {
          for (const [clientId, indicator] of Object.entries(incoming)) {
            if (clientId in nextIndicators) {
              nextIndicators[clientId] = [
                ...nextIndicators[clientId]!,
                indicator,
              ];
            } else {
              nextIndicators[clientId] = [indicator];
            }
          }
        }

        const { unconfirmed, version, stepMaps } = collabState;

        const nextDecorations = [];
        for (const clientIndicators of Object.values(nextIndicators)) {
          const indicator = clientIndicators
            .slice()
            .reverse()
            .find((i) => i.version <= version);

          if (!indicator) {
            continue;
          }

          const mappables = stepMaps
            .filter(({ version }) => version > indicator.version)
            .flatMap(({ mappables }) => mappables)
            .concat(unconfirmed.map(({ step }) => step.getMap()));

          const anchor = mappables.reduce(
            (acc, mappable) => mappable.map(acc),
            indicator.anchor,
          );
          const head = mappables.reduce(
            (acc, mappable) => mappable.map(acc),
            indicator.head,
          );

          nextDecorations.push(
            Decoration.inline(Math.min(anchor, head), Math.max(anchor, head), {
              style: `background-color: ${getPresenceColor(indicator.userId)}50;`,
            }),
          );
          nextDecorations.push(
            Decoration.inline(Math.min(anchor, head), Math.max(anchor, head), {
              style: `background-color: ${getPresenceColor(indicator.userId)}50;`,
            }),
          );

          nextDecorations.push(
            widget(anchor, PresenceAnchor, {
              ignoreSelection: true,
              key: indicator.clientId,
              indicator,
            }),
          );
        }

        return {
          decorations: DecorationSet.create(editorState.doc, nextDecorations),
          indicators,
          stepMaps,
        };
      },
    },
    props: {
      decorations(state) {
        return presenceKey.getState(state)?.decorations;
      },
    },
  });
}
