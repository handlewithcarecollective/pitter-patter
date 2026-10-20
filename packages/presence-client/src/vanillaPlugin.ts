import { Decoration } from "prosemirror-view";

import { createPresence } from "./basePlugin.ts";
import { createVanillaPresenceIndicator } from "./decorations/VanillaPresenceAnchor.ts";

export const presence = createPresence((pos, indicator, color) =>
  Decoration.widget(pos, createVanillaPresenceIndicator(indicator, color), {
    ignoreSelection: true,
    side: -1,
    key: indicator.clientId,
    indicator,
  }),
);
