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
              // We may get a new indicator for an existing version,
              // because the version is only updated when the actual
              // document contents change, but a user can move their
              // cursor without updating the document.
              nextIndicators[clientId] = [
                ...nextIndicators[clientId]!.filter(
                  (i) => i.version !== indicator.version,
                ),
                indicator,
              ];
            } else {
              nextIndicators[clientId] = [indicator];
            }
          }

          // Any clients that are not reported by the server
          // have left the document, so we should drop their
          // indicators
          for (const clientId of Object.keys(nextIndicators)) {
            if (!(clientId in incoming)) {
              delete nextIndicators[clientId];
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

          const confirmedMappables = stepMaps
            .filter(({ version }) => version > indicator.version)
            .flatMap(({ mappables }) => mappables);

          // This indicator may predate when we started tracking stepMaps.
          // If so, we have to ignore it, because we can't map it forward.
          if (confirmedMappables.length < version - indicator.version) {
            continue;
          }

          const mappables = confirmedMappables.concat(
            unconfirmed.map(({ step }) => step.getMap()),
          );

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
            // @ts-expect-error I dunno
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
