---
title: CommitsListener
---

# Interface: CommitsListener

Defined in:
[packages/collab-client/src/index.ts:15](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/collab-client/src/index.ts#L15)

## Properties

### listen

```ts
listen: (
  editorState: EditorState,
  options?: {
    signal?: AbortSignal;
  },
) => AsyncIterableIterator<Commit[]>;
```

Defined in:
[packages/collab-client/src/index.ts:16](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/collab-client/src/index.ts#L16)

#### Parameters

##### editorState

`EditorState`

##### options?

###### signal?

`AbortSignal`

#### Returns

`AsyncIterableIterator`\<[`Commit`](/docs/collab/reference/collab-client/classes/Commit)[]\>
