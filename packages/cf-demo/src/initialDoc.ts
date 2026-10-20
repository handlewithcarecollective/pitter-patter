import { type ProseMirrorJsonNode } from "@handlewithcare/prosemirror-json";

import { schema } from "./schema.ts";

const { doc, heading, paragraph, image, row, container } = schema.nodes;

// Round-tripped through JSON because ProseMirror creates attrs objects with a
// null prototype, which can't be structured-cloned across Durable Object RPC.
export const INITIAL_DOC_JSON: ProseMirrorJsonNode = JSON.parse(
  JSON.stringify(
    doc
      .create(null, [
        heading.create({ level: 1 }, schema.text("Call me Pitter Patter")),
        paragraph.create(null, [
          schema.text("This document is shared between "),
          schema.text("Ishmael", [schema.marks.strong.create()]),
          schema.text(" and "),
          schema.text("Queequeg", [schema.marks.strong.create()]),
          schema.text(
            ". Click anywhere and start typing — your changes appear in the other editor in real time, along with a cursor showing where you are.",
          ),
        ]),
        heading.create({ level: 2 }, schema.text("Work offline")),
        paragraph.create(
          null,
          schema.text(
            "Flip either editor offline and keep writing in both. When you reconnect, the edits are rebased and merged, and both editors converge on the same document.",
          ),
        ),
        heading.create({ level: 2 }, schema.text("Rearrange anything")),
        row.create(null, [
          image.create({
            shuffleStart: 1,
            shuffleEnd: 6,
            src: "/images/shuffle-cards.jpg",
            alt: "A deck of cards mid-shuffle",
          }),
          container.create({ shuffleStart: 7, shuffleEnd: 13 }, [
            paragraph.create(null, [
              schema.text(
                "Hover over a block and grab its handle to drag it somewhere new. Drop it ",
              ),
              schema.text("beside", [schema.marks.em.create()]),
              schema.text(" another block to put them in a row together."),
            ]),
            paragraph.create(
              null,
              schema.text(
                "Select a block to resize it with the handles on either side. Every block snaps to a twelve-column grid.",
              ),
            ),
          ]),
        ]),
        paragraph.create(
          null,
          schema.text(
            "Drag a paragraph or an image from the toolbar above to add a new block to either editor.",
          ),
        ),
      ])
      .toJSON(),
  ),
);
