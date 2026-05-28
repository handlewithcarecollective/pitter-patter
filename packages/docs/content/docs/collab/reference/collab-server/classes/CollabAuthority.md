---
title: CollabAuthority
---

# Class: CollabAuthority\<Transaction\>

Defined in:
[packages/collab-server/src/index.ts:116](https://github.com/handlewithcarecollective/pitter-patter/blob/5abff4884ea00d47f8bdf1fb824a3105dd55becd/packages/collab-server/src/index.ts#L116)

The CollabAuthority manages most of Pitter Patter's server side collaborative editing operations.

You create endpoints that call the appropriate CollabAuthority functions to integrate with a
CollabClient.

A CollabAuthority is designed to be stateless, so you can create a new one on every server, lambda,
or cloud function instance.

## Type Parameters

### Transaction

`Transaction`

## Constructors

### Constructor

```ts
new CollabAuthority<Transaction>(config: CollabAuthorityConfig<Transaction>): CollabAuthority<Transaction>;
```

Defined in:
[packages/collab-server/src/index.ts:126](https://github.com/handlewithcarecollective/pitter-patter/blob/5abff4884ea00d47f8bdf1fb824a3105dd55becd/packages/collab-server/src/index.ts#L126)

#### Parameters

##### config

[`CollabAuthorityConfig`](/docs/collab/reference/collab-server/interfaces/CollabAuthorityConfig)\<`Transaction`\>

#### Returns

`CollabAuthority`\<`Transaction`\>

## Methods

### listenForCommit()

```ts
listenForCommit(docId: string, version: number): Promise<CommitJSON[]>;
```

Defined in:
[packages/collab-server/src/index.ts:205](https://github.com/handlewithcarecollective/pitter-patter/blob/5abff4884ea00d47f8bdf1fb824a3105dd55becd/packages/collab-server/src/index.ts#L205)

Listens for remote changes to a document's editor state and returns when changes are found or after
a timeout specified in the CollabAuthority's `broadcastManager`.

#### Parameters

##### docId

`string`

##### version

`number`

#### Returns

`Promise`\<`CommitJSON`[]\>

---

### receiveCommit()

```ts
receiveCommit(docId: string, commitJSON: CommitJSON): Promise<void>;
```

Defined in:
[packages/collab-server/src/index.ts:155](https://github.com/handlewithcarecollective/pitter-patter/blob/5abff4884ea00d47f8bdf1fb824a3105dd55becd/packages/collab-server/src/index.ts#L155)

Receives a commit from a CollabClient and merges it into the remote editor state.

#### Parameters

##### docId

`string`

##### commitJSON

`CommitJSON`

#### Returns

`Promise`\<`void`\>

---

### runWithTransactionRetries()

```ts
runWithTransactionRetries<Result>(callback: (tr: Transaction) => Promise<Result>): Promise<Result>;
```

Defined in:
[packages/collab-server/src/index.ts:137](https://github.com/handlewithcarecollective/pitter-patter/blob/5abff4884ea00d47f8bdf1fb824a3105dd55becd/packages/collab-server/src/index.ts#L137)

#### Type Parameters

##### Result

`Result`

#### Parameters

##### callback

(`tr`: `Transaction`) => `Promise`\<`Result`\>

#### Returns

`Promise`\<`Result`\>
