---
title: receivePresenceTransaction
---

# Function: receivePresenceTransaction()

```ts
function receivePresenceTransaction(
  editorState: EditorState,
  presence: Record<string, PresenceIndicator>,
): Transaction;
```

Defined in:
[plugin.ts:23](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/presence-client/src/plugin.ts#L23)

Merges updated presence indicators into an editor state.

## Parameters

### editorState

`EditorState`

### presence

`Record`\<`string`,
[`PresenceIndicator`](/docs/presence/reference/presence-client/interfaces/PresenceIndicator)\>

## Returns

`Transaction`
