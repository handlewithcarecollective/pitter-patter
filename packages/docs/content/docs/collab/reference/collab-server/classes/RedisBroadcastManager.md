---
title: RedisBroadcastManager
---

# Class: RedisBroadcastManager

Defined in: [packages/collab-server/src/index.ts:260](https://github.com/handlewithcarecollective/pitter-patter/blob/b94327a2b900eb4da87f201cd6782be229f6bb20/packages/collab-server/src/index.ts#L260)

A broadcast manager that uses a Redis cluster as a message broker via Redis's pub/sub.

When a client connects it specifies the document id to listen to.

When changes are submitted to a document all listeners for that document id are notified
that there is an update.

## Constructors

### Constructor

```ts
new RedisBroadcastManager(config: RedisBroadcastManagerConfig): RedisBroadcastManager;
```

Defined in: [packages/collab-server/src/index.ts:265](https://github.com/handlewithcarecollective/pitter-patter/blob/b94327a2b900eb4da87f201cd6782be229f6bb20/packages/collab-server/src/index.ts#L265)

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

Defined in: [packages/collab-server/src/index.ts:282](https://github.com/handlewithcarecollective/pitter-patter/blob/b94327a2b900eb4da87f201cd6782be229f6bb20/packages/collab-server/src/index.ts#L282)

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

Defined in: [packages/collab-server/src/index.ts:278](https://github.com/handlewithcarecollective/pitter-patter/blob/b94327a2b900eb4da87f201cd6782be229f6bb20/packages/collab-server/src/index.ts#L278)

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

Defined in: [packages/collab-server/src/index.ts:289](https://github.com/handlewithcarecollective/pitter-patter/blob/b94327a2b900eb4da87f201cd6782be229f6bb20/packages/collab-server/src/index.ts#L289)

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
