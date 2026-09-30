import { Schema } from "prosemirror-model";

import { addShuffleNodes } from "@pitter-patter/shuffle";

/**
 * An inline SVG used as the default `src` for image nodes, so the harness never
 * depends on network requests or image decoding to produce a measurable box.
 */
const SQUARE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E" +
  "%3Crect width='80' height='80' fill='%237f8c9b'/%3E%3C/svg%3E";

const base = new Schema({
  nodes: {
    doc: { content: "block+" },
    text: { group: "inline" },
    paragraph: {
      group: "block",
      content: "inline*",
      toDOM: () => ["p", { "data-node-type": "paragraph" }, 0],
    },
    heading: {
      group: "block",
      content: "inline*",
      attrs: { level: { default: 2 } },
      defining: true,
      toDOM: (node) => {
        const level = node.attrs.level as number;
        const tag = level === 1 ? "h1" : level === 3 ? "h3" : "h2";
        return [tag, { "data-node-type": "heading" }, 0];
      },
    },
    image: {
      group: "block",
      atom: true,
      attrs: { src: { default: SQUARE } },
      toDOM: (node) => [
        "img",
        {
          "data-node-type": "image",
          src: node.attrs.src as string,
          alt: "",
          draggable: "false",
        },
      ],
    },
    card_deck: {
      group: "block",
      content: "card+",
      toDOM: () => ["div", { "data-node-type": "card_deck", class: "card-deck" }, 0],
    },
    card: {
      content: "paragraph+",
      toDOM: () => ["div", { "data-node-type": "card", class: "card" }, 0],
      pitterPatter: {
        shuffle: { containedBy: "card_deck", draggable: true },
      },
    },
  },
});

/**
 * The schema the harness (and therefore every test) renders. `addShuffleNodes`
 * adds the `row` and `container` nodes plus the `shuffleStart`, `shuffleEnd`
 * and `zIndex` attributes to every node in the `block` group, and marks them
 * draggable and resizable. `card` is deliberately left out of the `block` group:
 * it is draggable, but contained by `card_deck`.
 */
export const schema = addShuffleNodes(base, "block*", "block");
