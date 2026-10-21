import { Node as PmNode } from "prosemirror-model";
import { Decoration } from "prosemirror-view";

export type ViewDesc = NodeViewDesc & WidgetViewDesc;
interface WidgetViewDesc {
  widget: Decoration;
}

interface NodeViewDesc {
  node: PmNode;
  dom: HTMLElement;
  contentDOM?: HTMLElement;
  posBefore: number;
}
