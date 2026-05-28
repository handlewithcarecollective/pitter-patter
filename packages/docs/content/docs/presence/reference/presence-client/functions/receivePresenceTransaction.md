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
[plugin.ts:23](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/presence-client/src/plugin.ts#L23)

Merges updated presence indicators into an editor state.

## Parameters

### editorState

`EditorState`

### presence

`Record`\<`string`,
[`PresenceIndicator`](/docs/presence/reference/presence-client/interfaces/PresenceIndicator)\>

## Returns

`Transaction`
