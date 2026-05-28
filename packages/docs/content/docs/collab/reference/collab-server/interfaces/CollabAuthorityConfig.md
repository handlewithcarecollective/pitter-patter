---
title: CollabAuthorityConfig
---

# Interface: CollabAuthorityConfig\<Transaction\>

Defined in: [packages/collab-server/src/index.ts:35](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/collab-server/src/index.ts#L35)

The config for creating a CollabAuthority. Parameters that perform database operations should use the provided transaction
or if a transaction is not provided, start a transaction and perform all operation in the fuction within it.

## Type Parameters

### Transaction

`Transaction`

## Properties

### broadcastManager

```ts
broadcastManager: {
  broadcastCommit: (docId: string, commit: CommitJSON) => Promise<void>;
  createCommitListener: (docId: string, version: number) => Promise<CommitListener>;
};
```

Defined in: [packages/collab-server/src/index.ts:107](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/collab-server/src/index.ts#L107)

The broadcast manager that will be used to send and listen for document updates.

Current the only provided option is the [RedisBroadcastManager](/docs/collab/reference/collab-server/classes/RedisBroadcastManager). Inquire about support
for realtime databases like Firestore and Convex at hello@handlewithcare.dev.

#### broadcastCommit

```ts
broadcastCommit: (docId: string, commit: CommitJSON) => Promise<void>;
```

##### Parameters

###### docId

`string`

###### commit

`CommitJSON`

##### Returns

`Promise`\<`void`\>

#### createCommitListener

```ts
createCommitListener: (docId: string, version: number) => Promise<CommitListener>;
```

##### Parameters

###### docId

`string`

###### version

`number`

##### Returns

`Promise`\<[`CommitListener`](/docs/collab/reference/collab-server/interfaces/CommitListener)\>

***

### getCommit

```ts
getCommit: (tr: Transaction | null, docId: string, commitRef: string) => Promise<CommitJSON | null>;
```

Defined in: [packages/collab-server/src/index.ts:65](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/collab-server/src/index.ts#L65)

Given a docId and commitRef, retrieves the associated commit's steps and version from your database
and returns a joined CommitJSON object. Despite the name, CommitJSON is just a regular object with
fields for a commit's ref, version, and steps.

#### Parameters

##### tr

`Transaction` \| `null`

##### docId

`string`

##### commitRef

`string`

#### Returns

`Promise`\<`CommitJSON` \| `null`\>

***

### getCommits

```ts
getCommits: (tr: Transaction | null, docId: string, version: number) => Promise<CommitJSON[]>;
```

Defined in: [packages/collab-server/src/index.ts:74](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/collab-server/src/index.ts#L74)

For the provided docId, retrieves all commits from the database with a version number greater than,
`>`, the provided `version`.

#### Parameters

##### tr

`Transaction` \| `null`

##### docId

`string`

##### version

`number`

#### Returns

`Promise`\<`CommitJSON`[]\>

***

### getDoc

```ts
getDoc: (tr: Transaction | null, docId: string) => Promise<{
  docJSON: NodeJSON;
  lastUpdatedTimestamp: number;
  version: number;
}>;
```

Defined in: [packages/collab-server/src/index.ts:52](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/collab-server/src/index.ts#L52)

Retrieves a document from your database by docId.

If you are using Postgres or MySql, getDoc should select the row holding the document with `SELECT FOR UPDATE`.
This ensures that conflicting commits do not overwrite each other. We also recommend putting a unique constraint
on the commit table for the fields docId and commit version.

#### Parameters

##### tr

`Transaction` \| `null`

##### docId

`string`

#### Returns

`Promise`\<\{
  `docJSON`: `NodeJSON`;
  `lastUpdatedTimestamp`: `number`;
  `version`: `number`;
\}\>

***

### runWithTransaction

```ts
runWithTransaction: <Result>(callback: (tr: Transaction) => Promise<Result>) => Promise<Result>;
```

Defined in: [packages/collab-server/src/index.ts:42](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/collab-server/src/index.ts#L42)

This function should starts a transaction on your database, execute the provided callback with it, and commit the transaction.

If you are using Sqlite as a database, runWithTransaction should open a transaction with `BEGIN IMMEDIATE`.

#### Type Parameters

##### Result

`Result`

#### Parameters

##### callback

(`tr`: `Transaction`) => `Promise`\<`Result`\>

#### Returns

`Promise`\<`Result`\>

***

### saveCommit

```ts
saveCommit: (tr: Transaction | null, docId: string, ref: string, version: number, steps: {
[key: string]: unknown;
}[]) => Promise<void>;
```

Defined in: [packages/collab-server/src/index.ts:92](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/collab-server/src/index.ts#L92)

Saves a commit along with its version and ref to your database.

#### Parameters

##### tr

`Transaction` \| `null`

##### docId

`string`

##### ref

`string`

##### version

`number`

##### steps

\{
\[`key`: `string`\]: `unknown`;
\}[]

#### Returns

`Promise`\<`void`\>

***

### saveDoc

```ts
saveDoc: (tr: Transaction | null, docId: string, docJSON: NodeJSON, version: number, lastUpdatedTimestamp: number) => Promise<void>;
```

Defined in: [packages/collab-server/src/index.ts:82](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/collab-server/src/index.ts#L82)

Saves a document along with its docId, version, and lastUpdatedTimestamp to your database.

#### Parameters

##### tr

`Transaction` \| `null`

##### docId

`string`

##### docJSON

`NodeJSON`

##### version

`number`

##### lastUpdatedTimestamp

`number`

#### Returns

`Promise`\<`void`\>

***

### schema

```ts
schema: Schema;
```

Defined in: [packages/collab-server/src/index.ts:36](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/collab-server/src/index.ts#L36)
