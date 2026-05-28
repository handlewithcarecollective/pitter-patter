---
title: CollabAuthorityConfig
---

# Interface: CollabAuthorityConfig\<Transaction\>

Defined in:
[packages/collab-server/src/index.ts:32](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/collab-server/src/index.ts#L32)

The config for creating a CollabAuthority. Parameters that perform database operations should use
the provided transaction or if a transaction is not provided, start a transaction and perform all
database operations inside it.

## Type Parameters

### Transaction

`Transaction`

## Properties

### broadcastManager

```ts
broadcastManager: {
  broadcastCommit: (docId: string, commit: CommitJSON) => Promise<void>;
  createCommitListener: (docId: string, version: number) => Promise<CommitListener>;
}
```

Defined in:
[packages/collab-server/src/index.ts:89](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/collab-server/src/index.ts#L89)

The broadcast manager that will be used to listen for and send document updates.

Currently the only built-in option is the
[RedisBroadcastManager](/docs/collab/reference/collab-server/classes/RedisBroadcastManager).

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

---

### getCommit

```ts
getCommit: (tr: Transaction | null, docId: string, commitRef: string) => Promise<CommitJSON | null>;
```

Defined in:
[packages/collab-server/src/index.ts:53](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/collab-server/src/index.ts#L53)

Given a docId and commitRef, retrieves the associated commit's steps and version from your database
and returns a joined CommitJSON object.

#### Parameters

##### tr

`Transaction` \| `null`

##### docId

`string`

##### commitRef

`string`

#### Returns

`Promise`\<`CommitJSON` \| `null`\>

---

### getCommits

```ts
getCommits: (tr: Transaction | null, docId: string, version: number) => Promise<CommitJSON[]>;
```

Defined in:
[packages/collab-server/src/index.ts:61](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/collab-server/src/index.ts#L61)

For the provided docId, retrieves all commits from the database with a version number strictly
greater than the provided `version`.

#### Parameters

##### tr

`Transaction` \| `null`

##### docId

`string`

##### version

`number`

#### Returns

`Promise`\<`CommitJSON`[]\>

---

### getDoc

```ts
getDoc: (tr: Transaction | null, docId: string) =>
  Promise<{
    docJSON: NodeJSON;
    lastUpdatedTimestamp: number;
    version: number;
  }>;
```

Defined in:
[packages/collab-server/src/index.ts:41](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/collab-server/src/index.ts#L41)

Retrieves a document from your database by docId.

#### Parameters

##### tr

`Transaction` \| `null`

##### docId

`string`

#### Returns

`Promise`\<\{ `docJSON`: `NodeJSON`; `lastUpdatedTimestamp`: `number`; `version`: `number`; \}\>

---

### runWithTransaction

```ts
runWithTransaction: <Result>(callback: (tr: Transaction) => Promise<Result>) => Promise<Result>;
```

Defined in:
[packages/collab-server/src/index.ts:37](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/collab-server/src/index.ts#L37)

This function should start a transaction on your database, execute the provided callback with it,
and commit the transaction.

#### Type Parameters

##### Result

`Result`

#### Parameters

##### callback

(`tr`: `Transaction`) => `Promise`\<`Result`\>

#### Returns

`Promise`\<`Result`\>

---

### saveCommit

```ts
saveCommit: (
  tr: Transaction | null,
  docId: string,
  ref: string,
  version: number,
  steps: {
    [key: string]: unknown;
  }[],
) => Promise<void>;
```

Defined in:
[packages/collab-server/src/index.ts:75](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/collab-server/src/index.ts#L75)

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

\{ \[`key`: `string`\]: `unknown`; \}[]

#### Returns

`Promise`\<`void`\>

---

### saveDoc

```ts
saveDoc: (
  tr: Transaction | null,
  docId: string,
  docJSON: NodeJSON,
  version: number,
  lastUpdatedTimestamp: number,
) => Promise<void>;
```

Defined in:
[packages/collab-server/src/index.ts:65](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/collab-server/src/index.ts#L65)

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

---

### schema

```ts
schema: Schema;
```

Defined in:
[packages/collab-server/src/index.ts:33](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/collab-server/src/index.ts#L33)
