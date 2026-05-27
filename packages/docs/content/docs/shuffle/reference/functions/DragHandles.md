---
title: DragHandles
---

# Function: DragHandles()

```ts
function DragHandles(props: { handleComponent?: ComponentType<DragHandleProps> }): Element;
```

Defined in:
[components/DragHandles.tsx:43](https://github.com/handlewithcarecollective/pitter-patter/blob/d00ae753d2a935e710d41912ca995347835cab1b/packages/shuffle/src/components/DragHandles.tsx#L43)

A React component that renders the drag handles. This component will render a drag handle for each
node that the pointer is currently hovering over. It should be a descendant of the `ProseMirror`
component. The `handleComponent` prop can be used to provide a custom handle implementation.

## Parameters

### props

#### handleComponent?

`ComponentType`\<[`DragHandleProps`](/docs/shuffle/reference/interfaces/DragHandleProps)\>

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
