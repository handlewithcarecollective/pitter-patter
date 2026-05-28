---
title: CollabClient
---

# Class: CollabClient

Defined in:
[packages/collab-client/src/index.ts:71](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/collab-client/src/index.ts#L71)

The client that manages sending local editor state changes to the remote server and merging remote
changes into local editor state.

## Constructors

### Constructor

```ts
new CollabClient(config: CollabClientConfig): CollabClient;
```

Defined in:
[packages/collab-client/src/index.ts:78](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/collab-client/src/index.ts#L78)

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
[packages/collab-client/src/index.ts:118](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/collab-client/src/index.ts#L118)

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
[packages/collab-client/src/index.ts:87](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/collab-client/src/index.ts#L87)

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
[packages/collab-client/src/index.ts:110](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/collab-client/src/index.ts#L110)

Updates the desired portion of the client's `CollabClientConfig`. For example, this can be used to
update the auth headers used by `sendCommit`.

#### Parameters

##### config

`Partial`\<`Omit`\<[`CollabClientConfig`](/docs/collab/reference/collab-client/interfaces/CollabClientConfig),
`"listener"`\>\>

#### Returns

`void`
