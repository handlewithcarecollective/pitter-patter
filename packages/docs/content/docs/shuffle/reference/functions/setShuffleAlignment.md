---
title: setShuffleAlignment
---

# Function: setShuffleAlignment()

```ts
function setShuffleAlignment(
  pos: number,
  alignment: ShuffleAlignment,
): (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;
```

Defined in:
[commands.ts:36](https://github.com/handlewithcarecollective/pitter-patter/blob/9ec4cd60f040e2134c47209a80da4fdb85ebb21f/packages/shuffle/src/commands.ts#L36)

## Parameters

### pos

`number`

### alignment

[`ShuffleAlignment`](/docs/shuffle/reference/type-aliases/ShuffleAlignment)

## Returns

(`state`: `EditorState`, `dispatch?`: (`tr`: `Transaction`) => `void`) => `boolean`
