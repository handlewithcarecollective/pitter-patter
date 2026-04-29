import { Node, NodeSpec, NodeType, Schema } from "prosemirror-model";

export const shuffleAttrs: NodeSpec["attrs"] = {
  shuffleStart: {
    default: 4,
    validate(value) {
      return typeof value === "number" && value <= 13 && value >= 0;
    },
  },
  shuffleEnd: {
    default: 9,
    validate(value) {
      return typeof value === "number" && value <= 13 && value >= 0;
    },
  },
};

export const container: NodeSpec = {
  attrs: shuffleAttrs,
  defining: true,
  isolating: true,
  parseDOM: [{ tag: 'div[data-node-type="shuffle-container"]' }],
  toDOM() {
    return ["div", { "data-node-type": "shuffle-container", class: "container" }, 0];
  },
  pitterPatter: {
    shuffle: { role: "container", resizable: true, draggable: true },
  },
};

export const row: NodeSpec = {
  attrs: shuffleAttrs,
  parseDOM: [{ tag: 'div[data-node-type="shuffle-row"]' }],
  defining: true,
  isolating: true,
  toDOM() {
    return ["div", { "data-node-type": "shuffle-row", class: "row" }, 0];
  },
  pitterPatter: {
    shuffle: {
      role: "row",
      draggable: true,
    },
  },
};

export function addShuffleNodes<Nodes extends string, Marks extends string>(
  schema: Schema<Nodes, Marks>,
  content: string,
  group: string,
) {
  let nodes = schema.spec.nodes.append({
    container: { ...container, content, ...(group && { group }) },
    row: { ...row, content, ...(group && { group }) },
  });

  schema.spec.nodes.forEach((name, node) => {
    if (node.group?.match(new RegExp(`\b${group}\b`))) {
      nodes = nodes.update(name, {
        ...node,
        attrs: { ...node.attrs, ...shuffleAttrs },
        draggable: false,
        pitterPatter: {
          ...node.pitterPatter,
          shuffle: {
            ...node.pitterPatter?.shuffle,
            resizable: true,
            draggable: true,
          },
        },
      });
    }
  });

  return new Schema<Nodes | "container" | "row", Marks>({
    nodes,
    marks: schema.spec.marks,
  });
}

interface ShuffleSpec {
  resizable?: boolean;
  draggable?: boolean;
  role?: "row" | "container";
  containedBy?: string;
}

interface PitterPatterSpec {
  shuffle?: ShuffleSpec;
}

export function supportsResize(node: Node) {
  return !!node.type.spec.pitterPatter?.shuffle?.resizable;
}

export function supportsDrag(node: Node) {
  return !!node.type.spec.pitterPatter?.shuffle?.draggable;
}

export function isShuffleRow(node: Node) {
  return node.type.spec.pitterPatter?.shuffle?.role === "row";
}

export function isShuffleContainer(node: Node) {
  return !!node.type.spec.pitterPatter?.shuffle?.role;
}

export function getShuffleRowType(schema: Schema) {
  let rowType: NodeType | undefined = undefined;
  schema.spec.nodes.forEach((nodeName, nodeSpec) => {
    if (nodeSpec.pitterPatter?.shuffle?.role !== "row") return;

    rowType = schema.nodes[nodeName];
  });

  return rowType ?? null;
}

declare module "prosemirror-model" {
  interface NodeSpec {
    pitterPatter?: PitterPatterSpec;
  }
}
