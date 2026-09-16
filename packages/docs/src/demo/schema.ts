import { Schema } from "prosemirror-model";
import { schema as basic } from "prosemirror-schema-basic";

import { addShuffleNodes } from "@pitter-patter/shuffle";

const imageSpec = basic.spec.nodes.get("image");

basic.spec.nodes = basic.spec.nodes.update("image", {
  ...imageSpec,
  group: "block",
  inline: false,
});

basic.spec.nodes = basic.spec.nodes.update("card_deck", {
  group: "block",
  content: "card+",
  toDOM() {
    return ["div", { "data-node-type": "card_deck" }, 0];
  },
  parseDOM: [
    {
      tag: 'div[data-node-type="card_deck"]',
    },
  ],
});

basic.spec.nodes = basic.spec.nodes.update("card", {
  content: "paragraph+",
  toDOM() {
    return ["div", { "data-node-type": "card" }, 0];
  },
  parseDOM: [
    {
      tag: 'div[data-node-type="card"]',
    },
  ],
  pitterPatter: {
    shuffle: {
      containedBy: "card_deck",
      draggable: true,
    },
  },
});

let nodes = basic.spec.nodes.update("paragraph", {
  ...basic.spec.nodes.get("paragraph"),
  toDOM() {
    return ["p", { "data-node-type": "paragraph" }, 0];
  },
});

export const schema = addShuffleNodes(
  new Schema({ nodes, marks: basic.spec.marks }) as unknown as typeof basic,
  "block+",
  "block",
);
