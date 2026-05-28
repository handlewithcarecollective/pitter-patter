---
title: CommitsListener
---

# Interface: CommitsListener

Defined in: [packages/collab-client/src/index.ts:21](https://github.com/handlewithcarecollective/pitter-patter/blob/b94327a2b900eb4da87f201cd6782be229f6bb20/packages/collab-client/src/index.ts#L21)

## Properties

### listen

```ts
listen: (editorState: EditorState, options?: {
  signal?: AbortSignal;
}) => AsyncIterableIterator<Commit[]>;
```

Defined in: [packages/collab-client/src/index.ts:22](https://github.com/handlewithcarecollective/pitter-patter/blob/b94327a2b900eb4da87f201cd6782be229f6bb20/packages/collab-client/src/index.ts#L22)

#### Parameters

##### editorState

`EditorState`

##### options?

###### signal?

`AbortSignal`

#### Returns

`AsyncIterableIterator`\<[`Commit`](/docs/collab/reference/collab-client/classes/Commit)[]\>
