---
title: DragHandles
---

# Function: DragHandles()

```ts
function DragHandles(props: { handleComponent?: ComponentType<DragHandleProps> }): Element;
```

Defined in:
[components/DragHandles.tsx:43](https://github.com/handlewithcarecollective/pitter-patter/blob/77847a6e5f056de116cf628557786668e90c3b4e/packages/shuffle/src/components/DragHandles.tsx#L43)

A React component that renders the drag handles. This component will render a drag handle for each
node that the pointer is currently hovering over. It should be a descendant of the `ProseMirror`
component. The `handleComponent` prop can be used to provide a custom handle implementation.

## Parameters

### props

#### handleComponent?

`ComponentType`\<[`DragHandleProps`](../interfaces/DragHandleProps.md)\>

## Returns

`Element`

## Example

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
