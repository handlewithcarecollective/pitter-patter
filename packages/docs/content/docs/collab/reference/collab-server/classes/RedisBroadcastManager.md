---
title: RedisBroadcastManager
---

# Class: RedisBroadcastManager

Defined in:
[packages/collab-server/src/index.ts:251](https://github.com/handlewithcarecollective/pitter-patter/blob/5abff4884ea00d47f8bdf1fb824a3105dd55becd/packages/collab-server/src/index.ts#L251)

A broadcast manager that uses a Redis cluster as a message broker via Redis's pub/sub.

When a client connects it specifies the document id to listen to.

When changes are submitted to a document all listeners for that document id are notified that there
is an update.

## Constructors

### Constructor

```ts
new RedisBroadcastManager(config: RedisBroadcastManagerConfig): RedisBroadcastManager;
```

Defined in:
[packages/collab-server/src/index.ts:256](https://github.com/handlewithcarecollective/pitter-patter/blob/5abff4884ea00d47f8bdf1fb824a3105dd55becd/packages/collab-server/src/index.ts#L256)

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

Defined in:
[packages/collab-server/src/index.ts:273](https://github.com/handlewithcarecollective/pitter-patter/blob/5abff4884ea00d47f8bdf1fb824a3105dd55becd/packages/collab-server/src/index.ts#L273)

#### Parameters

##### docId

`string`

##### commitJSON

`CommitJSON`

#### Returns

`Promise`\<`void`\>

---

### connect()

```ts
connect(): Promise<void>;
```

Defined in:
[packages/collab-server/src/index.ts:269](https://github.com/handlewithcarecollective/pitter-patter/blob/5abff4884ea00d47f8bdf1fb824a3105dd55becd/packages/collab-server/src/index.ts#L269)

#### Returns

`Promise`\<`void`\>

---

### createCommitListener()

```ts
createCommitListener(docId: string, version: number): Promise<{
  abort: () => Promise<void>;
  listen: () => Promise<boolean>;
}>;
```

Defined in:
[packages/collab-server/src/index.ts:280](https://github.com/handlewithcarecollective/pitter-patter/blob/5abff4884ea00d47f8bdf1fb824a3105dd55becd/packages/collab-server/src/index.ts#L280)

#### Parameters

##### docId

`string`

##### version

`number`

#### Returns

`Promise`\<\{ `abort`: () => `Promise`\<`void`\>; `listen`: () => `Promise`\<`boolean`\>; \}\>
