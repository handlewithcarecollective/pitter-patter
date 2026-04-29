import {
  NodeViewComponentProps,
  ProseMirror,
  ProseMirrorDoc,
  reactKeys,
  useEditorEffect,
  useEditorState,
  useSelectNode,
  WidgetViewComponentProps,
} from "@handlewithcare/react-prosemirror";
import { schema as basic } from "prosemirror-schema-basic";
import { baseKeymap } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { EditorState } from "prosemirror-state";
import { createRoot } from "react-dom/client";

import { addShuffleNodes } from "../src/schema.ts";
import { shuffle } from "../src/plugin.ts";
import { GridSkeleton } from "../src/components/GridSkeleton.tsx";
import { ResizeHandles } from "../src/components/ResizeHandles.tsx";
import "../src/styles.css";
import "./styles.css";
import "prosemirror-view/style/prosemirror.css";
import { useState } from "react";

const imageSpec = basic.spec.nodes.get("image");

basic.spec.nodes = basic.spec.nodes.update("image", {
  ...imageSpec,
  group: "block",
  inline: false,
});

const schema = addShuffleNodes(basic, "block+", "block");

const doc = schema.nodes.doc.create(null, [
  schema.nodes.row.create({ shuffleStart: 1, shuffleEnd: 12 }, [
    schema.nodes.image.create({
      shuffleStart: 1,
      shuffleEnd: 5,
      src: "https://t4.ftcdn.net/jpg/02/71/88/53/360_F_271885326_Jkc8UkWTYmgB3dJjhrot2QZEiLneCaaM.jpg",
    }),
    schema.nodes.container.create({ shuffleStart: 7, shuffleEnd: 12 }, [
      // schema.nodes.container.create({}, [
      schema.nodes.paragraph.create(null, [schema.text("This is some sample text")]),
      schema.nodes.paragraph.create(null, [schema.text("This is some more sample text")]),
    ]),
  ]),
  schema.nodes.image.create({
    src: "https://t4.ftcdn.net/jpg/02/71/88/53/360_F_271885326_Jkc8UkWTYmgB3dJjhrot2QZEiLneCaaM.jpg",
  }),
  schema.nodes.paragraph.create(null, schema.text("Another paragraph not in a row.")),
]);

function Image({ nodeProps, children, ref, ...props }: NodeViewComponentProps) {
  useSelectNode(() => {});

  return (
    <img
      ref={ref}
      {...props}
      src={nodeProps.node.attrs.src}
      draggable={false}
      style={{ touchAction: "none", userSelect: "none" }}
    >
      {children}
    </img>
  );
}

const nodeViewComponents = {
  image: Image,
};

function createHandle(name: string) {
  const Handle = ({ widget, ref, getPos, ...props }: WidgetViewComponentProps) => {
    const [top, setTop] = useState(0);
    const [left, setLeft] = useState(0);

    useEditorEffect(
      (view) => {
        const viewRect = view.dom.getBoundingClientRect();
        const coords = view.coordsAtPos(widget.spec.nodePos, 1);
        setTop(coords.top - viewRect.top);
        setLeft(coords.left - viewRect.left + (widget.spec.nodeDepth - 1) * 24);
      },
      [widget.spec.nodePos, widget.spec.nodeDepth],
    );

    return (
      <div
        ref={ref}
        {...props}
        contentEditable={false}
        style={{
          position: "absolute",
          backgroundColor: "lightblue",
          transform: "translateY(-1.5rem)",
          top,
          left,
        }}
      >
        {name}
      </div>
    );
  };
  Handle.displayName = `${name}Handle`;
  return Handle;
}

const editorState = EditorState.create({
  doc,
  plugins: [
    reactKeys(),
    shuffle({
      dragHandles: {
        paragraph: createHandle("Paragraph"),
        container: createHandle("Container"),
        row: createHandle("Row"),
      },
    }),
    keymap(baseKeymap),
  ],
});

function Editor() {
  return (
    <ProseMirror defaultState={editorState} nodeViewComponents={nodeViewComponents}>
      <GridSkeleton>
        <ProseMirrorDoc />
        <ResizeHandles />
      </GridSkeleton>
    </ProseMirror>
  );
}

const root = createRoot(document.getElementById("root")!);

root.render(<Editor />);
