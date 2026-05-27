---
title: ShuffleSkeleton
---

# Function: ShuffleSkeleton()

```ts
function ShuffleSkeleton(props: { children: ReactNode }): Element;
```

Defined in:
[components/Skeleton.tsx:22](https://github.com/handlewithcarecollective/pitter-patter/blob/5f9831b289582242a2f8b7c6f9c1d64b034de5a9/packages/shuffle/src/components/Skeleton.tsx#L22)

A React component that renders the grid skeleton. This component must be rendered for resize and
reposition behaviors to work correctly. The component should be a direct parent of the
`ProseMirrorDoc` component.

## Parameters

### props

#### children

`ReactNode`

## Returns

`Element`

## Example

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
