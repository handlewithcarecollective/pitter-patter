import { Decoration } from "prosemirror-view";

import { createPresence } from "./basePlugin.ts";
import { createVanillaPresenceIndicator } from "./decorations/VanillaPresenceAnchor.ts";

export const presence = createPresence((pos, indicator) =>
  Decoration.widget(pos, createVanillaPresenceIndicator(indicator), {
    ignoreSelection: true,
    key: indicator.clientId,
    indicator,
  }),
);
