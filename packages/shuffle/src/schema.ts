import { Node, NodeSpec, NodeType, ResolvedPos, Schema } from "prosemirror-model";

/**
 * The default node attribute spec for Shuffle. Provides attribute specs for `shuffleStart` and
 * `shuffleEnd`, which represent the start and end column for a block. The minimum is 0 and the maximum
 * is 13. You may wish to override the default values, which are 4 and 9 for `shuffleStart` and
 * `shuffleEnd`, respectively.
 */
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

/**
 * A node spec for a container node. A container is a vertical group, meant to wrap other block nodes,
 * such as paragraphs.
 *
 * Containers are resizable and draggable.
 */
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

/**
 * A node spec for a row node. A row is a horizontal group, meant to wrap other block nodes (including
 * containers). Dragging a node to the side of another node will automatically group them into a row.
 *
 * A row’s child nodes can be repositioned horizontally within the row, and can even overlap each
 * other.
 */
export const row: NodeSpec = {
  parseDOM: [{ tag: 'div[data-node-type="shuffle-row"]' }],
  defining: true,
  isolating: true,
  toDOM() {
    return [
      "div",
      { "data-node-type": "shuffle-row", class: "shuffle-block row start-left end-right" },
      0,
    ];
  },
  pitterPatter: {
    shuffle: {
      role: "row",
      draggable: true,
    },
  },
};

/**
 * Options to be passed to `addShuffleNodes`. Can be used to override the default `shuffleStart` and
 * `shuffleEnd` attribute values.
 */
export interface AddShuffleNodesOptions {
  defaultStart?: number;
  defaultEnd?: number;
}

/**
 * Augments the provided schema with the row and container nodes, as well as adding the `shuffleStart`
 * and `shuffleEnd` attributes to every node in the group `group`. The `content` argument should be a
 * [content expression](https://prosemirror.net/docs/guide/#:~:text=content%20expressions), which will
 * be set on the row and container node specs.
 *
 * @param schema The ProseMirror schema to add shuffle nodes and attributes to
 * @param content The content expression to add to the row and container node specs
 * @param group Every node spec with this group will have shuffle attributes added, and be marked as
 *              resizable and draggable.
 */
export function addShuffleNodes<Nodes extends string, Marks extends string>(
  schema: Schema<Nodes, Marks>,
  content: string,
  group: string,
  options: AddShuffleNodesOptions = {},
) {
  const { defaultStart = 4, defaultEnd = 9 } = options;

  let nodes = schema.spec.nodes.append({
    container: { ...container, content, ...(group && { group }) },
    row: { ...row, content, ...(group && { group }) },
  });

  schema.spec.nodes.forEach((name, node) => {
    if (new RegExp(`\\b${group}\\b`).test(node.group ?? "")) {
      nodes = nodes.update(name, {
        ...node,
        attrs: {
          ...node.attrs,
          shuffleStart: {
            ...shuffleAttrs,
            default: defaultStart,
          },
          shuffleEnd: {
            ...shuffleAttrs,
            default: defaultEnd,
          },
        },
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

/**
 * Returns true if the provided node’s type supports resize behaviors.
 */
export function supportsResize(node: Node | undefined) {
  if (!node) return false;
  return !!node.type.spec.pitterPatter?.shuffle?.resizable;
}

/**
 * Returns true if the provided node’s type supports drag behaviors.
 */
export function supportsDrag(node: Node | undefined) {
  if (!node) return false;
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

export function getBeforeContainedBy($from: ResolvedPos) {
  const node = $from.nodeAfter;
  if (!node) return null;

  const containedByName = node.type.spec.pitterPatter?.shuffle?.containedBy;
  if (!containedByName) return null;

  let d = $from.depth;
  while ($from.node(d).type.name !== containedByName && d > 0) {
    d--;
  }

  if (d === 0) return null;

  return $from.doc.resolve($from.before(d));
}

declare module "prosemirror-model" {
  interface NodeSpec {
    pitterPatter?: PitterPatterSpec;
  }
}
