import {
  NodeViewComponentProps,
  ProseMirror,
  ProseMirrorDoc,
  reactKeys,
  useSelectNode,
} from "@handlewithcare/react-prosemirror";
import { schema as basic } from "prosemirror-schema-basic";
import { EditorState } from "prosemirror-state";
import { createRoot } from "react-dom/client";

import { addOrgNodes } from "../src/schema.ts";
import { organize } from "../src/plugin.ts";
import { GridSkeleton } from "../src/components/GridSkeleton.tsx";
import "../src/styles.css";

const imageSpec = basic.spec.nodes.get("image");

basic.spec.nodes = basic.spec.nodes.update("image", {
  ...imageSpec,
  group: "block",
  inline: false,
});

const schema = addOrgNodes(basic, "block+", "block");

const doc = schema.nodes.doc.create(null, [
  schema.nodes.row.create({ orgStart: 1, orgEnd: 12 }, [
    schema.nodes.image.create({
      orgStart: 1,
      orgEnd: 5,
      src: "https://t4.ftcdn.net/jpg/02/71/88/53/360_F_271885326_Jkc8UkWTYmgB3dJjhrot2QZEiLneCaaM.jpg",
    }),
    schema.nodes.container.create({ orgStart: 7, orgEnd: 12 }, [
      schema.nodes.paragraph.create(null, [
        schema.text("This is some sample text"),
      ]),
      schema.nodes.paragraph.create(null, [
        schema.text("This is some more sample text"),
      ]),
    ]),
  ]),
  schema.nodes.paragraph.create(
    null,
    schema.text("Another paragraph not in a row."),
  ),
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

const editorState = EditorState.create({
  doc,
  plugins: [reactKeys(), organize()],
});

function Editor() {
  return (
    <ProseMirror
      defaultState={editorState}
      nodeViewComponents={nodeViewComponents}
    >
      <GridSkeleton>
        <ProseMirrorDoc />
      </GridSkeleton>
    </ProseMirror>
  );
}

const root = createRoot(document.getElementById("root")!);

root.render(<Editor />);
