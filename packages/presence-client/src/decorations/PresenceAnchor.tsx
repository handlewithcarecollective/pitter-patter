import { type WidgetViewComponentProps } from "@handlewithcare/react-prosemirror";

import { PresenceIndicator } from "../PresenceIndicator";

// Taken from https://www.tableau.com/blog/colors-upgrade-tableau-10-56782
export const PRESENCE_COLORS = [
  "#4e79a7",
  "#59a14f",
  "#9c755f",
  "#f28e2b",
  "#edc948",
  "#bab0ac",
  "#e15759",
  "#b07aa1",
  "#76b7b2",
  "#ff9da7",
] as const;

export function getPresenceColor(userId: string) {
  let index = 0;
  for (const char of userId) {
    index += char.charCodeAt(0);
  }
  return PRESENCE_COLORS[index % PRESENCE_COLORS.length]!;
}

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
