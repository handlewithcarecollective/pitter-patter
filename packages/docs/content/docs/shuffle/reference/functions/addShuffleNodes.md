---
title: addShuffleNodes
---

# Function: addShuffleNodes()

```ts
function addShuffleNodes<Nodes, Marks>(
  schema: Schema<Nodes, Marks>,
  content: string,
  group: string,
  options?: AddShuffleNodesOptions,
): Schema<"container" | "row" | Nodes, Marks>;
```

Defined in:
[schema.ts:93](https://github.com/handlewithcarecollective/pitter-patter/blob/5f9831b289582242a2f8b7c6f9c1d64b034de5a9/packages/shuffle/src/schema.ts#L93)

Augments the provided schema with the row and container nodes, as well as adding the `shuffleStart`
and `shuffleEnd` attributes to every node in the group `group`. The `content` argument should be a
[content expression](https://prosemirror.net/docs/guide/#:~:text=content%20expressions), which will
be set on the row and container node specs.

## Type Parameters

### Nodes

`Nodes` _extends_ `string`

### Marks

`Marks` _extends_ `string`

## Parameters

### schema

`Schema`\<`Nodes`, `Marks`\>

The ProseMirror schema to add shuffle nodes and attributes to

### content

`string`

The content expression to add to the row and container node specs

### group

`string`

Every node spec with this group will have shuffle attributes added, and be marked as resizable and
draggable.

### options?

[`AddShuffleNodesOptions`](/docs/shuffle/reference/interfaces/AddShuffleNodesOptions) = `{}`

## Returns

`Schema`\<`"container"` \| `"row"` \| `Nodes`, `Marks`\>
