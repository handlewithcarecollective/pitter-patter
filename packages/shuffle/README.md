# `@pitter-patter/shuffle`

A grid-based drag-and-drop library for React ProseMirror.

## What is this?

Shuffle is a ProseMirror plugin that supports smooth, beautiful, grid-based reordering, auto-grouping, repositioning, and resizing.

## Installation

```sh
yarn add @pitter-patter/shuffle prosemirror-view@1.47.1
```

## Usage

### Update your schema

Shuffle can automatically extend your schema for you, or you can modify your schema yourself to add Shuffle support.

To extend your schema automatically:

```ts
import { addShuffleNodes } from "@pitter-patter/shuffle";

// Adds row and container nodes to your schema with
// content: "block+", and configures each node with
// the group "block" to be resizable and draggable.
const shuffledSchema = addShuffleNodes(schema, "block+", "block");
```

Or, to manually update your schema, just add the row and container nodes yourself, and configure
nodes to be resizable and draggable as needed:

```ts
import { container, row, shuffleAttrs } from "@pitter-patter/shuffle";

const schema = new Schema({
  nodes: {
    doc: {
      content: "block+",
    },
    text: {
      group: "inline",
      inline: true,
    },
    paragraph: {
      group: "block",
      content: "inline*",
      attrs: {
        ...shuffleAttrs,
      },
      pitterPatter: {
        shuffle: {
          resizable: true,
          draggablue: true,
        },
      },
    },
    row: {
      ...row,
      group: "block",
      content: "block+",
    },
    container: {
      ...container,
      group: "block",
      content: "block+",
    },
  },
});
```

### Add the plugin

Most of Shuffle’s logic lives in the `shuffle()` ProseMirror plugin. This should be added to your EditorState:

```ts
import { reactKeys } from "@handlewithcare/react-prosemirror";
import { shuffle } from "@pitter-patter/shuffle";

const editorState = EditorState.create({
  schema,
  doce,
  plugins: [reactKeys(), shuffle()],
});
```

The plugin can be passed a record of drag handle components. These should be React ProseMirror widget components.

```tsx
import {
  reactKeys,
  useEditorEffect,
  type WidgetViewComponentProps,
} from "@handlewithcare/react-prosemirror";
import { shuffle } from "@pitter-patter/shuffle";

function ParagraphHandle({ widget, ref, getPos, ...props }: WidgetViewComponentProps) {
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
}

const editorState = EditorState.create({
  schema,
  doc,
  plugins: [
    reactKeys(),
    shuffle({
      dragHandles: {
        paragraph: ParagraphHandle,
      },
    }),
  ],
});
```

### Wrap your ProseMirror component with the GridSkeleton

Shuffle provides a `GridSkeleton` component that you can wrap your `ProseMirrorDoc` with, as well as a `ResizeHandles` component:

```tsx
function Editor() {
  return (
    <ProseMirror defaultState={editorState}>
      <GridSkeleton>
        <ProseMirrorDoc />
        <ResizeHandles />
      </GridSkeleton>
    </ProseMirror>
  );
}
```
