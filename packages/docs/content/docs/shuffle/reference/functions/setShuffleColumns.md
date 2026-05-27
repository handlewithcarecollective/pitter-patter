---
title: setShuffleColumns
---

# Function: setShuffleColumns()

```ts
function setShuffleColumns(
  pos: number,
  start: number,
  end: number,
): (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;
```

Defined in:
[commands.ts:6](https://github.com/handlewithcarecollective/pitter-patter/blob/5f9831b289582242a2f8b7c6f9c1d64b034de5a9/packages/shuffle/src/commands.ts#L6)

## Parameters

### pos

`number`

### start

`number`

### end

`number`

## Returns

(`state`: `EditorState`, `dispatch?`: (`tr`: `Transaction`) => `void`) => `boolean`
