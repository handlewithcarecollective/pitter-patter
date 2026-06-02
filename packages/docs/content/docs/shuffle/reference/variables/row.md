---
title: row
---

# Variable: row

```ts
const row: NodeSpec;
```

Defined in:
[schema.ts:64](https://github.com/handlewithcarecollective/pitter-patter/blob/9ec4cd60f040e2134c47209a80da4fdb85ebb21f/packages/shuffle/src/schema.ts#L64)

A node spec for a row node. A row is a horizontal group, meant to wrap other block nodes (including
containers). Dragging a node to the side of another node will automatically group them into a row.

A row’s child nodes can be repositioned horizontally within the row, and can even overlap each
other.
