---
title: RedisBroadcastManager
---

# Class: RedisBroadcastManager

Defined in: [packages/collab-server/src/index.ts:257](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/collab-server/src/index.ts#L257)

A broadcast manager that uses a Redis cluster as a message broker via Redis's pub/sub.

When a client connects it specifies the document id to listen to.

When changes are submitted to a document all listeners for that document id are notified
that there is an update.

## Constructors

### Constructor

```ts
new RedisBroadcastManager(config: RedisBroadcastManagerConfig): RedisBroadcastManager;
```

Defined in: [packages/collab-server/src/index.ts:262](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/collab-server/src/index.ts#L262)

#### Parameters

##### config

[`RedisBroadcastManagerConfig`](/docs/collab/reference/collab-server/interfaces/RedisBroadcastManagerConfig)

#### Returns

`RedisBroadcastManager`

## Methods

### broadcastCommit()

```ts
broadcastCommit(docId: string, commitJSON: CommitJSON): Promise<void>;
```

Defined in: [packages/collab-server/src/index.ts:279](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/collab-server/src/index.ts#L279)

#### Parameters

##### docId

`string`

##### commitJSON

`CommitJSON`

#### Returns

`Promise`\<`void`\>

***

### connect()

```ts
connect(): Promise<void>;
```

Defined in: [packages/collab-server/src/index.ts:275](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/collab-server/src/index.ts#L275)

#### Returns

`Promise`\<`void`\>

***

### createCommitListener()

```ts
createCommitListener(docId: string, version: number): Promise<{
  abort: () => Promise<void>;
  listen: () => Promise<boolean>;
}>;
```

Defined in: [packages/collab-server/src/index.ts:286](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/collab-server/src/index.ts#L286)

#### Parameters

##### docId

`string`

##### version

`number`

#### Returns

`Promise`\<\{
  `abort`: () => `Promise`\<`void`\>;
  `listen`: () => `Promise`\<`boolean`\>;
\}\>
