---
title: PresenceClient
---

# Class: PresenceClient

Defined in:
[index.ts:19](https://github.com/handlewithcarecollective/pitter-patter/blob/5d0afded00b080a66ff242336c2afe1d7fdbb5a7/packages/presence-client/src/index.ts#L19)

The client that manages sending local presence state to the remote server and listening for remote
changes to presence state.

## Constructors

### Constructor

```ts
new PresenceClient(config: PresenceClientConfig): PresenceClient;
```

Defined in:
[index.ts:28](https://github.com/handlewithcarecollective/pitter-patter/blob/5d0afded00b080a66ff242336c2afe1d7fdbb5a7/packages/presence-client/src/index.ts#L28)

#### Parameters

##### config

[`PresenceClientConfig`](/docs/presence/reference/presence-client/index/interfaces/PresenceClientConfig)

#### Returns

`PresenceClient`

## Methods

### listen()

```ts
listen(signal?: AbortSignal): Promise<void>;
```

Defined in:
[index.ts:88](https://github.com/handlewithcarecollective/pitter-patter/blob/5d0afded00b080a66ff242336c2afe1d7fdbb5a7/packages/presence-client/src/index.ts#L88)

Start listening for remote presence changes. This function should only be called once.

#### Parameters

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
[index.ts:39](https://github.com/handlewithcarecollective/pitter-patter/blob/5d0afded00b080a66ff242336c2afe1d7fdbb5a7/packages/presence-client/src/index.ts#L39)

Send updated presence state to the remote PresenceAuthority.

#### Parameters

##### editorState

`EditorState`

#### Returns

`Promise`\<`void`\>

---

### update()

```ts
update(config: Partial<Omit<PresenceClientConfig, "listener">>): void;
```

Defined in:
[index.ts:80](https://github.com/handlewithcarecollective/pitter-patter/blob/5d0afded00b080a66ff242336c2afe1d7fdbb5a7/packages/presence-client/src/index.ts#L80)

Updates the desired portion of the client's `PresenceClientConfig`. For example, this can be used to
update the auth headers used by `send`.

#### Parameters

##### config

`Partial`\<`Omit`\<[`PresenceClientConfig`](/docs/presence/reference/presence-client/index/interfaces/PresenceClientConfig),
`"listener"`\>\>

#### Returns

`void`
