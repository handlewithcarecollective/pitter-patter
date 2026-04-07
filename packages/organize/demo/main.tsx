import {
  ProseMirror,
  ProseMirrorDoc,
  reactKeys,
} from "@handlewithcare/react-prosemirror";
import { schema as basic } from "prosemirror-schema-basic";
import { EditorState } from "prosemirror-state";
import { createRoot } from "react-dom/client";

import { addOrgNodes } from "../src/schema.ts";
import { organize } from "../src/plugin.ts";
import "../src/styles.css";

const imageSpec = basic.spec.nodes.get("image");

basic.spec.nodes = basic.spec.nodes.update("image", {
  ...imageSpec,
  group: "block",
  inline: false,
});

const schema = addOrgNodes(basic, "block+", "block");

const doc = schema.nodes.doc.create(null, [
  schema.nodes.row.create({ orgStart: 1, orgEnd: 11 }, [
    schema.nodes.image.create({
      orgStart: 1,
      orgEnd: 5,
      src: "https://t4.ftcdn.net/jpg/02/71/88/53/360_F_271885326_Jkc8UkWTYmgB3dJjhrot2QZEiLneCaaM.jpg",
    }),
    schema.nodes.container.create({ orgStart: 7, orgEnd: 11 }, [
      schema.nodes.paragraph.create(null, [
        schema.text("This is some sample text"),
      ]),
      schema.nodes.paragraph.create(null, [
        schema.text("This is some more sample text"),
      ]),
    ]),
  ]),
]);

const editorState = EditorState.create({
  doc,
  plugins: [reactKeys(), organize()],
});

function Editor() {
  return (
    <ProseMirror defaultState={editorState}>
      <ProseMirrorDoc />
    </ProseMirror>
  );
}

const root = createRoot(document.getElementById("root")!);

root.render(<Editor />);
