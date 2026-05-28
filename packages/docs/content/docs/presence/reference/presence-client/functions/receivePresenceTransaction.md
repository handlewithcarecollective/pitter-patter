---
title: receivePresenceTransaction
---

# Function: receivePresenceTransaction()

```ts
function receivePresenceTransaction(editorState: EditorState, presence: Record<string, PresenceIndicator>): Transaction;
```

Defined in: [plugin.ts:23](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/presence-client/src/plugin.ts#L23)

Merges updated presence indicators into an editor state.

## Parameters

### editorState

`EditorState`

### presence

`Record`\<`string`, [`PresenceIndicator`](/docs/presence/reference/presence-client/interfaces/PresenceIndicator)\>

## Returns

`Transaction`
