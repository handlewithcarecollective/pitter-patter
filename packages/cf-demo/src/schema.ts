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
});

basic.spec.nodes = basic.spec.nodes.update("card", {
  content: "paragraph+",
  pitterPatter: {
    shuffle: {
      containedBy: "card_deck",
      draggable: true,
    },
  },
});

export const schema = addShuffleNodes(
  new Schema({ nodes: basic.spec.nodes, marks: basic.spec.marks }) as unknown as typeof basic,
  "block+",
  "block",
  { defaultStart: 0, defaultEnd: 13 },
);
