// "use client";

import {
  NodeViewComponentProps,
  ProseMirror,
  ProseMirrorDoc,
  reactKeys,
  useSelectNode,
} from "@handlewithcare/react-prosemirror";
import { baseKeymap, toggleMark } from "prosemirror-commands";
import { history, undo, redo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { Schema } from "prosemirror-model";
import { schema as basic } from "prosemirror-schema-basic";
import { EditorState } from "prosemirror-state";
import { Decoration } from "prosemirror-view";

import {
  shuffle,
  addShuffleNodes,
  DragHandles,
  DragHandle,
  type DragHandleProps,
  ShuffleSkeleton,
  ResizeHandles,
} from "@pitter-patter/shuffle";

import "./shuffle.css";
import "@pitter-patter/shuffle/style/shuffle.css";
import "prosemirror-view/style/prosemirror.css";

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

const schema = addShuffleNodes(
  new Schema({ nodes, marks: basic.spec.marks }) as unknown as typeof basic,
  "block+",
  "block",
);

const doc = schema.nodes.doc.create(null, [
  schema.nodes.heading.create({ level: 2 }, schema.text("Shuffle Demo")),
  schema.nodes.paragraph.create(
    null,
    schema.text(
      "Shuffle is a ProseMirror plugin that supports smooth, grid-based reordering, auto-grouping, repositioning, and resizing. Drag this paragraph to see it in action.",
    ),
  ),
  schema.nodes.paragraph.create(
    null,
    schema.text(
      "ProseMirror has built-in drag-and-drop behavior, but it's limited in functionality and relies on the browser’s native “ghosted” drag thumbnails. Shuffle focuses on clarity: users should be able to see how their actions are affecting their document in real time, and know exactly what the document will look like when they drop.",
    ),
  ),
  schema.nodes.heading.create({ level: 3 }, schema.text("Reordering")),
  schema.nodes.paragraph.create(
    null,
    schema.text(
      "Use Shuffle to drag ProseMirror nodes around the document, automatically swapping positions with other node views, sinking and lifting to arbitrary depths as needed, and giving constant feedback to the user about how their document is changing.",
    ),
  ),
  schema.nodes.container.create({ shuffleStart: 2, shuffleEnd: 11 }, [
    schema.nodes.heading.create({ level: 3 }, schema.text("Resizing")),
    schema.nodes.paragraph.create(
      null,
      schema.text(
        "Shuffle divides the editor width into 12 equal columns. Blocks snap to column boundaries when resized or repositioned. Select any block and drag its handles to resize it.",
      ),
    ),
  ]),
  schema.nodes.heading.create({ level: 3 }, schema.text("Rows and containers")),
  schema.nodes.paragraph.create(
    null,
    schema.text(
      "Rows are horizontal groupings of block nodes. Drag a block next to another and Shuffle wraps them in a row automatically. Drag the last block out and the row disappears.",
    ),
  ),
  schema.nodes.paragraph.create(
    null,
    schema.text(
      "Containers are an optional vertical grouping of block nodes that behave similarly to rows. Blocks inside of it can be aligned. A container persists after you remove the blocks inside of it.",
    ),
  ),
  schema.nodes.row.create(null, [
    schema.nodes.image.create({
      shuffleStart: 1,
      shuffleEnd: 5,
      src: "/images/shuffle-cards.jpg",
    }),
    schema.nodes.container.create({ shuffleStart: 7, shuffleEnd: 12 }, [
      schema.nodes.paragraph.create(null, [
        schema.text(
          "When you drag a block beside another, Shuffle can automatically create a row. Drag everything out of the row and the row dissolves.",
        ),
      ]),
      schema.nodes.paragraph.create(null, [
        schema.text(
          "Within a row, blocks can be repositioned independently. Try adjusting the horizontal position of the blocks in this row.",
        ),
      ]),
    ]),
  ]),
  schema.nodes.row.create(null, [
    schema.nodes.paragraph.create({ shuffleStart: 3, shuffleEnd: 7, zIndex: 2 }, [
      schema.text(
        "When blocks overlap, the last one you touched sits on top. You can drag and drop the other block in place to bring it forward.",
      ),
    ]),
    schema.nodes.image.create({
      shuffleStart: 6,
      shuffleEnd: 10,
      zIndex: 1,
      src: "/images/shuffle-dance.jpg",
    }),
  ]),
  schema.nodes.heading.create({ level: 3 }, schema.text("Containment")),
  schema.nodes.paragraph.create(
    null,
    schema.text(
      "The card deck below uses containment - its cards can be dragged and reordered within the deck, but they can’t be moved outside of it. The schema defines what is allowed and Shuffle enforces it automatically.",
    ),
  ),
  schema.nodes.card_deck.create({ shuffleStart: 2, shuffleEnd: 11 }, [
    schema.nodes.card.create(null, [
      schema.nodes.paragraph.create(null, [
        schema.text("You can configure containment on node types."),
      ]),
    ]),
    schema.nodes.card.create(null, [
      schema.nodes.paragraph.create(null, [
        schema.text("These cards can be dragged around within their deck…"),
      ]),
    ]),
    schema.nodes.card.create(null, [
      schema.nodes.paragraph.create(null, [
        schema.text("…but they can't be dropped outside of it!"),
      ]),
    ]),
  ]),
  schema.nodes.heading.create({ level: 3 }, schema.text("Inflate")),
  schema.nodes.paragraph.create(
    null,
    schema.text(
      "New blocks can be dragged into the document directly from the menu. Grab any component from the panel and drop it where you want.",
    ),
  ),
]);

function Image({ nodeProps, ref, children: _, ...props }: NodeViewComponentProps) {
  useSelectNode(() => {});

  return (
    <img
      ref={ref}
      {...props}
      src={nodeProps.node.attrs.src}
      draggable={false}
      style={{ touchAction: "none", userSelect: "none" }}
    />
  );
}

const nodeViewComponents = {
  image: Image,
  card_deck: CardDeck,
  card: Card,
};

function hoverDecorations(from: number, to: number) {
  return Decoration.node(from, to, {
    class: "shuffle-hover-block",
  });
}

const editorState = EditorState.create({
  doc,
  plugins: [
    reactKeys(),
    shuffle({
      hoverDecorations,
    }),
    history(),
  ],
});

const plugins = [
  keymap({
    ...baseKeymap,
    "Mod-i": toggleMark(schema.marks.em),
    "Mod-b": toggleMark(schema.marks.strong),
    "Mod-Shift-c": toggleMark(schema.marks.code),
    "Mod-z": undo,
    "Mod-y": redo,
    "Mod-Shift-z": redo,
  }),
];

export function ShuffleDemo() {
  return (
    <div>
      <p>
        Drag one of the menu items below into the document to automatically create a node of that
        type!
      </p>
      <div className="inflatable-menu">
        <div
          data-shuffle-inflatable={JSON.stringify(
            schema.nodes.card_deck
              .create(null, [
                schema.nodes.card.create(null, [
                  schema.nodes.paragraph.create(null, [schema.text("This is a deck of cards.")]),
                ]),
                schema.nodes.card.create(null, [
                  schema.nodes.paragraph.create(null, [
                    schema.text("You can drag cards around to reorder them."),
                  ]),
                ]),
                schema.nodes.card.create(null, [
                  schema.nodes.paragraph.create(null, [
                    schema.text("But you can't drag cards from one deck to another!"),
                  ]),
                ]),
              ])
              .toJSON(),
          )}
          className="inflatable"
        >
          Card deck
        </div>
        <div
          data-shuffle-inflatable={JSON.stringify(
            schema.nodes.image
              .create({
                src: "/images/shuffle-dance.jpg",
              })
              .toJSON(),
          )}
          className="inflatable"
        >
          Image
        </div>
        <div
          data-shuffle-inflatable={JSON.stringify(
            schema.nodes.paragraph.create(null, schema.text("A brand new paragraph!")).toJSON(),
          )}
          className="inflatable"
        >
          Paragraph
        </div>
      </div>
      <ProseMirror
        defaultState={editorState}
        nodeViewComponents={nodeViewComponents}
        plugins={plugins}
      >
        <ShuffleSkeleton>
          <ProseMirrorDoc />
          <ResizeHandles />
          <DragHandles handleComponent={CustomHandle} />
        </ShuffleSkeleton>
      </ProseMirror>
    </div>
  );
}

function CustomHandle(props: DragHandleProps) {
  if (["image", "card", "card_deck"].includes(props.node.type.name)) {
    return null;
  }
  return <DragHandle {...props} />;
}

function CardDeck({ nodeProps: _, ref, children, ...props }: NodeViewComponentProps) {
  return (
    <div
      ref={ref}
      {...props}
      className={`card-deck ${props.className ?? ""}`}
      data-node-type="card_deck"
    >
      {children}
    </div>
  );
}

function Card({ nodeProps: _, ref, children, ...props }: NodeViewComponentProps) {
  return (
    <div ref={ref} {...props} className={`card ${props.className ?? ""}`} data-node-type="card">
      {children}
    </div>
  );
}
