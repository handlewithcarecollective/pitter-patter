import { Node, NodeSpec, Schema } from "prosemirror-model";

export const gridAttrs: NodeSpec["attrs"] = {
  shuffleStart: {
    default: 4,
    validate(value) {
      return typeof value === "number" && value <= 11 && value >= 1;
    },
  },
  shuffleEnd: {
    default: 9,
    validate(value) {
      return typeof value === "number" && value <= 11 && value >= 1;
    },
  },
};

export const container: NodeSpec = {
  attrs: gridAttrs,
  defining: true,
  isolating: true,
  parseDOM: [{ tag: 'div[data-node-type="shuffle-container"]' }],
  toDOM() {
    return [
      "div",
      { "data-node-type": "shuffle-container", class: "container" },
      0,
    ];
  },
  pitterPatter: {
    isShuffleContainer: true,
  },
};

export const row: NodeSpec = {
  attrs: gridAttrs,
  parseDOM: [{ tag: 'div[data-node-type="shuffle-row"]' }],
  defining: true,
  isolating: true,
  toDOM() {
    return ["div", { "data-node-type": "shuffle-row", class: "row" }, 0];
  },
  pitterPatter: {
    isShuffleContainer: true,
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
    if (node.group?.includes(group)) {
      nodes = nodes.update(name, {
        ...node,
        attrs: { ...node.attrs, ...gridAttrs },
        draggable: false,
        pitterPatter: {
          ...node.pitterPatter,
          isShuffleBlock: true,
        },
      });
    }
  });

  return new Schema<Nodes | "container" | "row", Marks>({
    nodes,
    marks: schema.spec.marks,
  });
}

interface PitterPatterSpec {
  hasShuffleDragHandle?: boolean;
  isShuffleBlock?: boolean;
  isShuffleContainer?: boolean;
}

export function supportsResize(node: Node) {
  return (
    node.type.spec.pitterPatter?.isShuffleBlock ||
    node.type.spec.pitterPatter?.isShuffleContainer
  );
}

declare module "prosemirror-model" {
  interface NodeSpec {
    pitterPatter?: PitterPatterSpec;
  }
}
