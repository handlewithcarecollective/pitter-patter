---
title: RedisPresenceBroadcastManager
---

# Class: RedisPresenceBroadcastManager

Defined in:
[index.ts:153](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/presence-server/src/index.ts#L153)

A broadcast manager that uses a Redis cluster as a message broker via Redis's pub/sub.

When a client connects it specifies the document id to listen to.

When presence state changes for a document all listeners for that document id are notified that
there is an update.

## Constructors

### Constructor

```ts
new RedisPresenceBroadcastManager(config: RedisPresenceBroadcastManagerConfig): RedisPresenceBroadcastManager;
```

Defined in:
[index.ts:158](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/presence-server/src/index.ts#L158)

#### Parameters

##### config

[`RedisPresenceBroadcastManagerConfig`](/docs/presence/reference/presence-server/interfaces/RedisPresenceBroadcastManagerConfig)

#### Returns

`RedisPresenceBroadcastManager`

## Methods

### broadcastIndicator()

```ts
broadcastIndicator(docId: string, indicator: PresenceIndicator): Promise<void>;
```

Defined in:
[index.ts:172](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/presence-server/src/index.ts#L172)

#### Parameters

##### docId

`string`

##### indicator

[`PresenceIndicator`](/docs/presence/reference/presence-server/interfaces/PresenceIndicator)

#### Returns

`Promise`\<`void`\>

---

### connect()

```ts
connect(): Promise<void>;
```

Defined in:
[index.ts:168](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/presence-server/src/index.ts#L168)

#### Returns

`Promise`\<`void`\>

---

### listenForPresence()

```ts
listenForPresence(
   docId: string,
   excludeClientId: string,
refs: Record<string, string>): Promise<void>;
```

Defined in:
[index.ts:179](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/presence-server/src/index.ts#L179)

#### Parameters

##### docId

`string`

##### excludeClientId

`string`

##### refs

`Record`\<`string`, `string`\>

#### Returns

`Promise`\<`void`\>
