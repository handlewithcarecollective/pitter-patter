---
title: useResizeHandlePointerDown
---

# Function: useResizeHandlePointerDown()

```ts
function useResizeHandlePointerDown(pos: number, side: "start" | "end"): (...args: []) => void;
```

Defined in:
[components/ResizeHandles.tsx:188](https://github.com/handlewithcarecollective/pitter-patter/blob/d00ae753d2a935e710d41912ca995347835cab1b/packages/shuffle/src/components/ResizeHandles.tsx#L188)

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
