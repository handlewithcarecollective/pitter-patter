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

import { shuffle, addShuffleNodes, ShuffleSkeleton, ResizeHandles } from "@pitter-patter/shuffle";

import "./styles.css";
import "@pitter-patter/shuffle/style/shuffle.css";
import "prosemirror-view/style/prosemirror.css";

const imageSpec = basic.spec.nodes.get("image");

basic.spec.nodes = basic.spec.nodes.update("image", {
  ...imageSpec,
  group: "block",
  inline: false,
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
    ></img>
  );
}

const nodeViewComponents = {
  image: Image,
};

function hoverDeco(name: string) {
  return function (from: number, to: number) {
    return Decoration.node(from, to, {
      class: "shuffle-hover-block",
      "data-shuffle-demo-node-name": name,
    });
  };
}

const editorState = EditorState.create({
  doc,
  plugins: [
    reactKeys(),
    shuffle({
      hoverDecorations: {
        paragraph: hoverDeco("Paragraph"),
        container: hoverDeco("Container"),
        row: hoverDeco("Row"),
        image: hoverDeco("Image"),
      },
    }),
    keymap(baseKeymap),
  ],
});

export function ShuffleDemo() {
  return (
    <ProseMirror defaultState={editorState} nodeViewComponents={nodeViewComponents}>
      <ShuffleSkeleton>
        <ProseMirrorDoc />
        <ResizeHandles />
      </ShuffleSkeleton>
    </ProseMirror>
  );
}
