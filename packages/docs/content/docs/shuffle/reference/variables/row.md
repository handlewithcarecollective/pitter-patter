---
title: row
---

# Variable: row

```ts
const row: NodeSpec;
```

Defined in:
[schema.ts:50](https://github.com/handlewithcarecollective/pitter-patter/blob/77847a6e5f056de116cf628557786668e90c3b4e/packages/shuffle/src/schema.ts#L50)

A node spec for a row node. A row is a horizontal group, meant to wrap other block nodes (including
containers). Dragging a node to the side of another node will automatically group them into a row.

A row’s child nodes can be repositioned horizontally within the row, and can even overlap each
other.
