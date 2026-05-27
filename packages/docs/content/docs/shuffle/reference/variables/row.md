---
title: row
---

# Variable: row

```ts
const row: NodeSpec;
```

Defined in:
[schema.ts:54](https://github.com/handlewithcarecollective/pitter-patter/blob/d00ae753d2a935e710d41912ca995347835cab1b/packages/shuffle/src/schema.ts#L54)

A node spec for a row node. A row is a horizontal group, meant to wrap other block nodes (including
containers). Dragging a node to the side of another node will automatically group them into a row.

A row’s child nodes can be repositioned horizontally within the row, and can even overlap each
other.
