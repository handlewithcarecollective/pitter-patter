---
title: RedisBroadcastManager
---

# Class: RedisBroadcastManager

Defined in: [packages/collab-server/src/index.ts:258](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/collab-server/src/index.ts#L258)

A broadcast manager that uses a Redis cluster as a message broker via Redis's pub/sub.

When a client connects it specifies the document id to listen to.

When changes are submitted to a document all listeners for that document id are notified
that there is an update.

## Constructors

### Constructor

```ts
new RedisBroadcastManager(config: RedisBroadcastManagerConfig): RedisBroadcastManager;
```

Defined in: [packages/collab-server/src/index.ts:263](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/collab-server/src/index.ts#L263)

#### Parameters

##### config

`RedisBroadcastManagerConfig`

#### Returns

`RedisBroadcastManager`

## Methods

### broadcastCommit()

```ts
broadcastCommit(docId: string, commitJSON: CommitJSON): Promise<void>;
```

Defined in: [packages/collab-server/src/index.ts:280](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/collab-server/src/index.ts#L280)

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

Defined in: [packages/collab-server/src/index.ts:276](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/collab-server/src/index.ts#L276)

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

Defined in: [packages/collab-server/src/index.ts:287](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/collab-server/src/index.ts#L287)

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
