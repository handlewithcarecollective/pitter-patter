import { type WidgetViewComponentProps } from "@handlewithcare/react-prosemirror";

import { PresenceIndicator } from "../PresenceIndicator.ts";

import { getPresenceColor } from "./getPresenceColor.ts";

export function PresenceAnchor({ widget, getPos: _, ...props }: WidgetViewComponentProps) {
  const indicator = widget.type.spec["indicator"] as PresenceIndicator;
  const userId = indicator.userId;
  const presenceColor = getPresenceColor(userId);

  return (
    <span {...props} className="pitter-patter-presence-anchor">
      <span
        className="pitter-patter-presence-anchor-head"
        style={{
          backgroundColor: presenceColor,
        }}
      >
        <span className="pitter-patter-presence-anchor-user-id">{userId}</span>
      </span>
      <span
        className="pitter-patter-presence-anchor-body"
        style={{
          backgroundColor: presenceColor,
        }}
      />
    </span>
  );
}
