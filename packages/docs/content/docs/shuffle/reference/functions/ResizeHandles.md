---
title: ResizeHandles
---

# Function: ResizeHandles()

```ts
function ResizeHandles(props: {
  handleComponent?: ComponentType<{
    onPointerDown: EventHandler<PointerEvent<Element>>;
    style: {
      left: number;
      top: number;
    };
  }>;
}): Element | null;
```

Defined in:
[components/ResizeHandles.tsx:44](https://github.com/handlewithcarecollective/pitter-patter/blob/77847a6e5f056de116cf628557786668e90c3b4e/packages/shuffle/src/components/ResizeHandles.tsx#L44)

A React component that renders the resize handles. This component will render a single set of resize
handles whenever the selection is within a resizable node. It should be a descendant of the
`ProseMirror` component. The `handleComponent` prop can be used to provide a custom handle
implementation.

## Parameters

### props

#### handleComponent?

`ComponentType`\<\{ `onPointerDown`: `EventHandler`\<`PointerEvent`\<`Element`\>\>; `style`: \{
`left`: `number`; `top`: `number`; \}; \}\>

## Returns

`Element` \| `null`

## Example

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
