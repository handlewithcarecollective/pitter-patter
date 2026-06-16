import { widget } from "@handlewithcare/react-prosemirror";

import { createPresence } from "./basePlugin.ts";
import { PresenceAnchor } from "./decorations/PresenceAnchor.tsx";

export const presence = createPresence((pos, indicator) =>
  // @ts-expect-error I dunno
  widget(pos, PresenceAnchor, {
    ignoreSelection: true,
    key: indicator.clientId,
    indicator,
  }),
);
