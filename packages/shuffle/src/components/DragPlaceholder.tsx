import { WidgetViewComponentProps } from "@handlewithcare/react-prosemirror";
import { forwardRef } from "react";

export const DragPlaceholder = forwardRef<HTMLDivElement, WidgetViewComponentProps>(
  function DragPlaceholder({ widget }, ref) {
    const { width, height, gridRow } = widget.spec;
    return <div data-shuffle-placeholder={true} ref={ref} style={{ width, height, gridRow }} />;
  },
);
