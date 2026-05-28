---
title: PresenceClient
---

# Class: PresenceClient

Defined in: [index.ts:24](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/presence-client/src/index.ts#L24)

The client that manages sending local presence state to the remote server and listening 
for remote changes to presence state.

## Constructors

### Constructor

```ts
new PresenceClient(config: PresenceClientConfig): PresenceClient;
```

Defined in: [index.ts:33](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/presence-client/src/index.ts#L33)

#### Parameters

##### config

[`PresenceClientConfig`](/docs/presence/reference/presence-client/interfaces/PresenceClientConfig)

#### Returns

`PresenceClient`

## Methods

### listen()

```ts
listen(signal?: AbortSignal): Promise<void>;
```

Defined in: [index.ts:93](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/presence-client/src/index.ts#L93)

Start listening for remote presence changes. This function should only be called once.

#### Parameters

##### signal?

`AbortSignal`

#### Returns

`Promise`\<`void`\>

***

### send()

```ts
send(editorState: EditorState): Promise<void>;
```

Defined in: [index.ts:44](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/presence-client/src/index.ts#L44)

Send updated presence state to the remote PresenceAuthority.

#### Parameters

##### editorState

`EditorState`

#### Returns

`Promise`\<`void`\>

***

### update()

```ts
update(config: Partial<Omit<PresenceClientConfig, "listener">>): void;
```

Defined in: [index.ts:85](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/presence-client/src/index.ts#L85)

Updates the desired portion of the client's `PresenceClientConfig`. For example, this can 
be used to update the auth headers used by `send`.

#### Parameters

##### config

`Partial`\<`Omit`\<[`PresenceClientConfig`](/docs/presence/reference/presence-client/interfaces/PresenceClientConfig), `"listener"`\>\>

#### Returns

`void`
