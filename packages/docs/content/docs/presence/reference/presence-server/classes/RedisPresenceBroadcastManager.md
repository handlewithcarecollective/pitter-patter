---
title: RedisPresenceBroadcastManager
---

# Class: RedisPresenceBroadcastManager

Defined in: [index.ts:169](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/presence-server/src/index.ts#L169)

A broadcast manager that uses a Redis cluster as a message broker via Redis's pub/sub.

When a client connects it specifies the document id to listen to.

When presence state changes for a document all listeners for that document id are notified
that there is an update.

## Constructors

### Constructor

```ts
new RedisPresenceBroadcastManager(config: RedisPresenceBroadcastManagerConfig): RedisPresenceBroadcastManager;
```

Defined in: [index.ts:174](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/presence-server/src/index.ts#L174)

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

Defined in: [index.ts:188](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/presence-server/src/index.ts#L188)

#### Parameters

##### docId

`string`

##### indicator

[`PresenceIndicator`](/docs/presence/reference/presence-server/interfaces/PresenceIndicator)

#### Returns

`Promise`\<`void`\>

***

### connect()

```ts
connect(): Promise<void>;
```

Defined in: [index.ts:184](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/presence-server/src/index.ts#L184)

#### Returns

`Promise`\<`void`\>

***

### listenForPresence()

```ts
listenForPresence(
   docId: string, 
   excludeClientId: string, 
refs: Record<string, string>): Promise<void>;
```

Defined in: [index.ts:195](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/presence-server/src/index.ts#L195)

#### Parameters

##### docId

`string`

##### excludeClientId

`string`

##### refs

`Record`\<`string`, `string`\>

#### Returns

`Promise`\<`void`\>
