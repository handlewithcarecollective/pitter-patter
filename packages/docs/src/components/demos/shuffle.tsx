// "use client";

import {
  NodeViewComponentProps,
  ProseMirror,
  ProseMirrorDoc,
  reactKeys,
  useSelectNode,
} from "@handlewithcare/react-prosemirror";
import { baseKeymap } from "prosemirror-commands";
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
  schema.nodes.row.create({ shuffleStart: 1, shuffleEnd: 12 }, [
    schema.nodes.image.create({
      shuffleStart: 1,
      shuffleEnd: 5,
      src: "https://t4.ftcdn.net/jpg/02/71/88/53/360_F_271885326_Jkc8UkWTYmgB3dJjhrot2QZEiLneCaaM.jpg",
    }),
    schema.nodes.container.create({ shuffleStart: 7, shuffleEnd: 12 }, [
      schema.nodes.paragraph.create(null, [schema.text("This is some sample text")]),
      schema.nodes.paragraph.create(null, [schema.text("This is some more sample text")]),
    ]),
  ]),
  schema.nodes.image.create({
    src: "https://t4.ftcdn.net/jpg/02/71/88/53/360_F_271885326_Jkc8UkWTYmgB3dJjhrot2QZEiLneCaaM.jpg",
  }),
  schema.nodes.paragraph.create(null, schema.text("Another paragraph not in a row.")),
  schema.nodes.card_deck.create({ shuffleStart: 2, shuffleEnd: 11 }, [
    schema.nodes.card.create(null, [
      schema.nodes.paragraph.create(null, [
        schema.text("You can configure containment on node types, too."),
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
    keymap(baseKeymap),
  ],
});

export function ShuffleDemo() {
  return (
    <div>
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
          className="card-deck-inflatable"
        >
          Card deck
        </div>
      </div>
      <ProseMirror defaultState={editorState} nodeViewComponents={nodeViewComponents}>
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
