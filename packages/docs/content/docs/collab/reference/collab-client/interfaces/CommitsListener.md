---
title: CommitsListener
---

# Interface: CommitsListener

Defined in:
[packages/collab-client/src/index.ts:21](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/collab-client/src/index.ts#L21)

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
[packages/collab-client/src/index.ts:22](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/collab-client/src/index.ts#L22)

#### Parameters

##### editorState

`EditorState`

##### options?

###### signal?

`AbortSignal`

#### Returns

`AsyncIterableIterator`\<[`Commit`](/docs/collab/reference/collab-client/classes/Commit)[]\>
