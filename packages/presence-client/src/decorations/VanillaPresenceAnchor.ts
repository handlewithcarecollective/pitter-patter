import { EditorView } from "prosemirror-view";

import { PresenceIndicator } from "../PresenceIndicator.ts";

import { getPresenceColor } from "./getPresenceColor.ts";

type WidgetConstructor = ((view: EditorView, getPos: () => number | undefined) => Node) | Node;

export function createVanillaPresenceIndicator(indicator: PresenceIndicator): WidgetConstructor {
  const userId = indicator.userId;
  const presenceColor = getPresenceColor(userId);

  const userIdEl = document.createElement("span");
  userIdEl.classList.add("pitter-patter-presence-anchor-user-id");
  userIdEl.appendChild(document.createTextNode(userId));

  const head = document.createElement("span");
  head.classList.add("pitter-patter-presence-anchor-head");
  head.style.backgroundColor = presenceColor;

  head.appendChild(userIdEl);

  const body = document.createElement("span");
  body.classList.add("pitter-patter-presence-anchor-body");
  body.style.backgroundColor = presenceColor;

  const anchor = document.createElement("span");
  anchor.classList.add("pitter-patter-presence-anchor");

  anchor.appendChild(head);
  anchor.appendChild(body);

  return anchor;
}
