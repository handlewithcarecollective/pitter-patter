---
title: CommitsListener
---

# Interface: CommitsListener

Defined in: [packages/collab-client/src/index.ts:21](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/collab-client/src/index.ts#L21)

## Properties

### listen

```ts
listen: (editorState: EditorState, options?: {
  signal?: AbortSignal;
}) => AsyncIterableIterator<Commit[]>;
```

Defined in: [packages/collab-client/src/index.ts:22](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/collab-client/src/index.ts#L22)

#### Parameters

##### editorState

`EditorState`

##### options?

###### signal?

`AbortSignal`

#### Returns

`AsyncIterableIterator`\<[`Commit`](/docs/collab/reference/collab-client/classes/Commit)[]\>
