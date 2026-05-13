# `@pitter-patter/shuffle`

A grid-based drag-and-drop library for React ProseMirror.

## What is this?

Shuffle is a ProseMirror plugin that supports smooth, beautiful, grid-based reordering,
auto-grouping, repositioning, and resizing.

## Installation

```sh
yarn add @pitter-patter/shuffle prosemirror-view@1.41.7
```

<!-- toc -->

- [Usage](#usage)
  - [Update your schema](#update-your-schema)
  - [Add the plugin](#add-the-plugin)
  - [Wrap your ProseMirror component with the ShuffleSkeleton](#wrap-your-prosemirror-component-with-the-shuffleskeleton)
  - [Import the styles](#import-the-styles)
- [Customizing](#customizing)
- [API](#api)
  - [`shuffleAttrs`](#shuffleattrs)
  - [`container`](#container)
  - [`row`](#row)
  - [`AddShuffleNodesOptions`](#addshufflenodesoptions)
  - [`addShuffleNodes`](#addshufflenodes)
  - [`ShufflePluginOptions`](#shufflepluginoptions)
  - [`shuffle`](#shuffle)
  - [`shufflePluginKey`](#shufflepluginkey)
  - [`ShuffleSkeleton`](#shuffleskeleton)
  - [`ResizeHandles`](#resizehandles)
  - [`useResizeHandlePointerDown`](#useresizehandlepointerdown)
  - [`supportsResize`](#supportsresize)
  - [`supportsDrag`](#supportsdrag)
- [Looking for someone to collaborate with?](#looking-for-someone-to-collaborate-with)

<!-- tocstop -->

## Usage

### Update your schema

Shuffle requires a few schema modifications in order to work as expected:

- A `row` node spec. `row` is a block node that should allow other top level blocks as children.
  When a node is dragged alongside an existing node, they will be automatically wrapped in a `row`
  parent node, which allows them to live on the same grid row.
- A `container` node spec. `container` is an optional vertical grouping of block nodes.
- A `pitterPatter.shuffle` configuration for any existing node specs that should be draggable and/or
  resizable.

Shuffle can automatically extend your schema for you, or you can modify your schema yourself to add
Shuffle support.

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

Most of Shuffle’s logic lives in the `shuffle()` ProseMirror plugin. This should be added to your
EditorState:

```ts
import { reactKeys } from "@handlewithcare/react-prosemirror";
import { shuffle } from "@pitter-patter/shuffle";

const editorState = EditorState.create({
  schema,
  doce,
  plugins: [reactKeys(), shuffle()],
});
```

### Configure hover decorations

In schemas that can have deeply nested nodes, it can be helpful to use borders or highlights to
indicate to the user which nodes are being hovered over.

The `hoverDecorations` argument to the shuffle plugin creator will be called with each hovered node
to determine whether to render a node decoration.

```tsx
import { reactKeys } from "@handlewithcare/react-prosemirror";
import { shuffle } from "@pitter-patter/shuffle";
import { Decoration } from "prosemirror-view";
import { Node } from "prosemirror-model";

function hoverDecorations(from: number, to: number, node: Node) {
  // Return null to skip decorations for a given node
  if (node.type.name === "image") return null;

  return Decoration.node(from, to, {
    class: "shuffle-hover-block",
  });
}

const editorState = EditorState.create({
  schema,
  doc,
  plugins: [
    reactKeys(),
    shuffle({
      hoverDecorations,
    }),
  ],
});
```

### Wrap your ProseMirror component with the `ShuffleSkeleton` and add `ResizeHandles` and `DragHandles`

Shuffle provides a `ShuffleSkeleton` component that wraps your `ProseMirrorDoc`. It renders
Shuffle's grid skeleton, and must be rendered for resize and reposition behaviors to work correctly.
The component should be a direct parent of the `ProseMirrorDoc` component.

To add resize handles to your elements, include the `ResizeHandles` component as a child of your
`ShuffleSkeleton`. Likewise, include the `DragHandles` component to render drag handles.

```tsx
function Editor() {
  return (
    <ProseMirror defaultState={editorState}>
      <ShuffleSkeleton>
        <ProseMirrorDoc />
        <ResizeHandles />
        <DragHandles />
      </ShuffleSkeleton>
    </ProseMirror>
  );
}
```

### Import the styles

Shuffle provides a small functional stylesheet for visualizing and positioning nodes on the grid.

```ts
import "@pitter-patter/shuffle/styles.css";
```

## Customizing

The appearance of the skeleton can be customized with CSS variables:

```css
:root {
  --shuffle-column-width: 3rem; /* The width of an individual grid column */
  --shuffle-gutter-width: 1.5rem; /* The visual gap between grid columns in the skeleton */
  --shuffle-row-gap: 1rem; /* The gap between rows in the grid */
  --shuffle-skeleton-color: lightgray /* The color of the grid columns in the skeleton */;
}
```

The `ResizeHandles` component optionally takes a `handleComponent` prop that will be used instead of
the default light blue button:

```tsx
import { ResizeHandles } from "@pitter-patter/shuffle";
import { EventHandler, PointerDown } from "react";

interface Props {
  style: { top: number; left: number };
  onPointerDown: EventHandler<PointerDown>;
}

function ResizeHandle({ styles, onPointerDown }) {
  return (
    <button type="button" className="resize-handle" styles={styles} onPointerDown={onPointerDown} />
  );
}

function Editor() {
  return (
    <ProseMirror defaultState={editorState}>
      <ShuffleSkeleton>
        <ProseMirrorDoc />
        <ResizeHandles handleComponent={ResizeHandle} />
      </ShuffleSkeleton>
    </ProseMirror>
  );
}
```

Similarly, the `DragHandles` component optionally takes a `handleComponent` prop that will be used
instead of the default light blue button:

```tsx
import { DragHandles } from "@pitter-patter/shuffle";
import { EventHandler, PointerDown } from "react";

interface Props {
  style: { top: number; left: number };
  onPointerDown: EventHandler<PointerDown>;
}

function DragHandle({ styles, onPointerDown, node }) {
  return (
    <button type="button" className="drag-handle" styles={styles} onPointerDown={onPointerDown}>
      {node.type.name[0].toUpperCase() + node.type.name.slice(1)}
    </button>
  );
}

function Editor() {
  return (
    <ProseMirror defaultState={editorState}>
      <ShuffleSkeleton>
        <ProseMirrorDoc />
        <DragHandles handleComponent={DragHandle} />
      </ShuffleSkeleton>
    </ProseMirror>
  );
}
```

## API

### `shuffleAttrs`

```ts
const shuffleAttrs: NodeSpec["attrs"];
```

The default node attribute spec for Shuffle. Provides attribute specs for `shuffleStart` and
`shuffleEnd`, which represent the start and end column for a block. The minimum is 0 and the maximum
is 13. You may wish to override the default values, which are 4 and 9 for `shuffleStart` and
`shuffleEnd`, respectively.

### `container`

```ts
const container: NodeSpec;
```

A node spec for a container node. A container is a vertical group, meant to wrap other block nodes,
such as paragraphs.

Containers are resizable and draggable.

### `row`

```ts
const row: NodeSpec;
```

A node spec for a row node. A row is a horizontal group, meant to wrap other block nodes (including
containers). Dragging a node to the side of another node will automatically group them into a row.

A row’s child nodes can be repositioned horizontally within the row, and can even overlap each
other.

### `AddShuffleNodesOptions`

```ts
interface AddShuffleNodesOptions {
  defaultStart?: number;
  defaultEnd?: number;
}
```

Options to be passed to `addShuffleNodes`. Can be used to override the default `shuffleStart` and
`shuffleEnd` attribute values.

### `addShuffleNodes`

```ts
function addShuffleNodes<Nodes extends string, Marks extends string>(
  schema: Schema<Nodes, Marks>,
  content: string,
  group: string,
  { defaultStart = 4, defaultEnd = 9 }: AddShuffleNodesOptions = {},
): Schema<Nodes | "row" | "container", Marks>;
```

Augments the provided schema with the row and container nodes, as well as adding the `shuffleStart`
and `shuffleEnd` attributes to every node in the group `group`. The `content` argument should be a
[content expression](https://prosemirror.net/docs/guide/#:~:text=content%20expressions), which will
be set on the row and container node specs.

### `ShufflePluginOptions`

```ts
interface ShufflePluginOptions {
  hoverDecorations?: (from: number, to: number, node: Node) => Decoration | null;
}
```

Options to be passed to `shuffle`. Can be used to provide hover decorations.

### `shuffle`

```ts
function shuffle({ hoverDecorations }: ShufflePluginOptions = {}): Plugin<ShufflePluginState>;
```

A ProseMirror plugin factory. Manages decorations, state, and event listeners necessary for
autogroup, reorder, and reposition behaviors.

### `shufflePluginKey`

```ts
const shufflePluginKey: PluginKey<ShufflePluginState>;
```

A ProseMirror plugin key. Can be used to retrieve the plugin state for the `shuffle` plugin, or get
or set the plugin’s meta.

### `ShuffleSkeleton`

```ts
function ShuffleSkeleton(props: { children: ReactNode }): JSX.Element;
```

A React component that renders the grid skeleton. This component must be rendered for resize and
reposition behaviors to work correctly. The component should be a direct parent of the
`ProseMirrorDoc` component.

Example usage:

```tsx
function Editor() {
  return (
    <ProseMirror defaultState={editorState}>
      <ShuffleSkeleton>
        <ProseMirrorDoc />
      </ShuffleSkeleton>
    </ProseMirror>
  );
}
```

### `ResizeHandles`

```ts
function ResizeHandles(props: {
  handleComponent?: ComponentType<{
    style: { top: number; left: number };
    onPointerDown: EventHandler<PointerDown>;
  }>;
}): JSX.Element;
```

A React component that renders the resize handles. This component will render a single set of resize
handles whenever the selection is within a resizable node. It should be a descendant of the
`ProseMirror` component. The `handleComponent` prop can be used to provide a custom handle
implementation.

Example usage:

```tsx
function Editor() {
  return (
    <ProseMirror defaultState={editorState}>
      <ShuffleSkeleton>
        <ProseMirrorDoc />
        <ResizeHandles />
      </ShuffleSkeleton>
    </ProseMirror>
  );
}
```

### `DragHandles`

```ts
function DragHandles(props: {
  handleComponent?: ComponentType<{
    style: { top: number; left: number };
    onPointerDown: EventHandler<SyntheticPointerEvent>;
    node: Node;
  }>;
}): JSX.Element;
```

A React component that renders the drag handles. This component will render a drag handle for each
node that the pointer is currently hovering over. It should be a descendant of the `ProseMirror`
component. The `handleComponent` prop can be used to provide a custom handle implementation.

Example usage:

```tsx
function Editor() {
  return (
    <ProseMirror defaultState={editorState}>
      <ShuffleSkeleton>
        <ProseMirrorDoc />
        <DragHandles />
      </ShuffleSkeleton>
    </ProseMirror>
  );
}
```

### `useResizeHandlePointerDown`

```ts
function useResizeHandlePointerDown(pos: number, side: "start" | "end"): () => void;
```

A React hook that can be used to build a custom resize handles component. It takes the position of
the selected node and whether to create a handler for the start or end handler.

It returns an event handler that can be added to the `"pointerdown"` event.

### `supportsResize`

```ts
function supportsResize(node: Node | undefined): boolean;
```

Returns true if the provided node’s type supports resize behaviors.

### `supportsDrag`

```ts
function supportsDrag(node: Node | undefined): boolean;
```

Returns true if the provided node’s type supports drag behaviors.

## Looking for someone to collaborate with?

Reach out to [Handle with Care](https://handlewithcare.dev/#get-in-touch)! We're a product
development collective with years of experience bringing excellent ideas to life. We love React and
ProseMirror, and we're always looking for new folks to work with!
