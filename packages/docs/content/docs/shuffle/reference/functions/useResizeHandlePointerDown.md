---
title: useResizeHandlePointerDown
---

# Function: useResizeHandlePointerDown()

```ts
function useResizeHandlePointerDown(pos: number, side: "start" | "end"): (...args: []) => void;
```

Defined in:
[components/ResizeHandles.tsx:188](https://github.com/handlewithcarecollective/pitter-patter/blob/77847a6e5f056de116cf628557786668e90c3b4e/packages/shuffle/src/components/ResizeHandles.tsx#L188)

A React hook that can be used to build a custom resize handles component. It takes the position of
the selected node and whether to create a handler for the start or end handler.

It returns an event handler that can be added to the `"pointerdown"` event.

## Parameters

### pos

`number`

### side

`"start"` \| `"end"`

## Returns

(...`args`: \[\]) => `void`
