---
title: CollabClient
---

# Class: CollabClient

Defined in:
[packages/collab-client/src/index.ts:65](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/collab-client/src/index.ts#L65)

The client that manages sending local editor state changes to the remote server and merging remote
changes into local editor state.

## Constructors

### Constructor

```ts
new CollabClient(config: CollabClientConfig): CollabClient;
```

Defined in:
[packages/collab-client/src/index.ts:72](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/collab-client/src/index.ts#L72)

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

Defined in:
[packages/collab-client/src/index.ts:112](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/collab-client/src/index.ts#L112)

Start listening for remote commits. This function should only be called once.

#### Parameters

##### editorState

`EditorState`

##### signal?

`AbortSignal`

#### Returns

`Promise`\<`void`\>

---

### send()

```ts
send(editorState: EditorState): Promise<void>;
```

Defined in:
[packages/collab-client/src/index.ts:81](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/collab-client/src/index.ts#L81)

Send local editor state changes to the remote server.

#### Parameters

##### editorState

`EditorState`

#### Returns

`Promise`\<`void`\>

---

### update()

```ts
update(config: Partial<Omit<CollabClientConfig, "listener">>): void;
```

Defined in:
[packages/collab-client/src/index.ts:104](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/collab-client/src/index.ts#L104)

Updates the desired portion of the client's `CollabClientConfig`. For example, this can be used to
update the auth headers used by `sendCommit`.

#### Parameters

##### config

`Partial`\<`Omit`\<[`CollabClientConfig`](/docs/collab/reference/collab-client/interfaces/CollabClientConfig),
`"listener"`\>\>

#### Returns

`void`
