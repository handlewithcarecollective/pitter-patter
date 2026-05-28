---
title: CollabClientConfig
---

# Interface: CollabClientConfig

Defined in: [packages/collab-client/src/index.ts:28](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/collab-client/src/index.ts#L28)

## Properties

### listener

```ts
listener: CommitsListener;
```

Defined in: [packages/collab-client/src/index.ts:46](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/collab-client/src/index.ts#L46)

A listener for remote commits.

Currently the only option is the [LongPollListener](/docs/collab/reference/collab-client/classes/LongPollListener).

Support for realtime databases like Firestore and Convex is planned
and can be expedited on request. Contact hello@handlewithcare.dev to inquire.

***

### receiveCommits

```ts
receiveCommits: (commits: Commit[]) => void;
```

Defined in: [packages/collab-client/src/index.ts:63](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/collab-client/src/index.ts#L63)

Receives an array of commits and merges them into your local editor state.

#### Parameters

##### commits

[`Commit`](/docs/collab/reference/collab-client/classes/Commit)[]

#### Returns

`void`

#### Example

```
import receiveCommitTransaction from "@stepwisehq/prosemirror-collab-commit/collab-commit";

receiveIndicators: (indicators) => {
  setState((prev) => prev.apply(receivePresenceTransaction(prev, indicators)));
},
```

***

### sendCommit

```ts
sendCommit: (commit: Commit) => Promise<void>;
```

Defined in: [packages/collab-client/src/index.ts:37](https://github.com/handlewithcarecollective/pitter-patter/blob/07eceda4a58d50cdb03c8d2d3a81703a1376252d/packages/collab-client/src/index.ts#L37)

Sends local commits to a remote server to be merged into the remote document state.
The endpoint this function hits is defined by you, and should call the
CollabAuthority's [receiveCommit](https://pitter-patter.dev/docs/collab/reference/collab-server/classes/CollabAuthority#receivecommit)
function

#### Parameters

##### commit

[`Commit`](/docs/collab/reference/collab-client/classes/Commit)

the latest prosemirror commit made by the local user

#### Returns

`Promise`\<`void`\>
