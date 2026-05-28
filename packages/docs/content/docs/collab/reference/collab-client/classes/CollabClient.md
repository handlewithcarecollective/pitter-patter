---
title: CollabClient
---

# Class: CollabClient

Defined in: [packages/collab-client/src/index.ts:70](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/collab-client/src/index.ts#L70)

The client that manages sending local editor state changes to the remote server and merging
remote changes into local editor state.

## Constructors

### Constructor

```ts
new CollabClient(config: CollabClientConfig): CollabClient;
```

Defined in: [packages/collab-client/src/index.ts:77](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/collab-client/src/index.ts#L77)

#### Parameters

##### config

[`CollabClientConfig`](/docs/collab/reference/collab-client/interfaces/CollabClientConfig)

#### Returns

`CollabClient`

## Methods

### listen()

```ts
listen(editorState: EditorState, signal?: AbortSignal): Promise<void>;
```

Defined in: [packages/collab-client/src/index.ts:117](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/collab-client/src/index.ts#L117)

Have the client start listening for remote commits. This function should only be called once.

#### Parameters

##### editorState

`EditorState`

##### signal?

`AbortSignal`

#### Returns

`Promise`\<`void`\>

***

### send()

```ts
send(editorState: EditorState): Promise<void>;
```

Defined in: [packages/collab-client/src/index.ts:86](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/collab-client/src/index.ts#L86)

send local editor state changes to the remote server

#### Parameters

##### editorState

`EditorState`

#### Returns

`Promise`\<`void`\>

***

### update()

```ts
update(config: Partial<Omit<CollabClientConfig, "listener">>): void;
```

Defined in: [packages/collab-client/src/index.ts:109](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/collab-client/src/index.ts#L109)

Updates the desired portion of the client's `CollabClientConfig`. For example, this can
be used to update the auth headers used by `sendCommit`.

#### Parameters

##### config

`Partial`\<`Omit`\<[`CollabClientConfig`](/docs/collab/reference/collab-client/interfaces/CollabClientConfig), `"listener"`\>\>

#### Returns

`void`
