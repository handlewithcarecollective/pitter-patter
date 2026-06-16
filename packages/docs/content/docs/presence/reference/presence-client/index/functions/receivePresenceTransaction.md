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

Defined in: basePlugin.ts:19

Merges updated presence indicators into an editor state.

## Parameters

### editorState

`EditorState`

### presence

`Record`\<`string`,
[`PresenceIndicator`](/docs/presence/reference/presence-client/index/interfaces/PresenceIndicator)\>

## Returns

`Transaction`
