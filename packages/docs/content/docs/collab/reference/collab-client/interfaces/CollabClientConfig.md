---
title: CollabClientConfig
---

# Interface: CollabClientConfig

Defined in: [packages/collab-client/src/index.ts:28](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/collab-client/src/index.ts#L28)

## Properties

### listener

```ts
listener: CommitsListener;
```

Defined in: [packages/collab-client/src/index.ts:43](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/collab-client/src/index.ts#L43)

A listener for remote commits.

Currently the only built-in option is the [LongPollListener](/docs/collab/reference/collab-client/classes/LongPollListener).

***

### receiveCommits

```ts
receiveCommits: (commits: Commit[]) => void;
```

Defined in: [packages/collab-client/src/index.ts:64](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/collab-client/src/index.ts#L64)

Receives an array of commits and merges them into your local editor state.

#### Parameters

##### commits

[`Commit`](/docs/collab/reference/collab-client/classes/Commit)[]

#### Returns

`void`

#### Example

```
import receiveCommitTransaction from "@stepwisehq/prosemirror-collab-commit/collab-commit";

receiveCommits: (commits) => {
  view.dispatch(
    view.state.apply(
      commits.reduce((acc, commit) => acc.apply(receiveCommitTransaction(acc, commit)), prev)
    )
  )
},
```

***

### sendCommit

```ts
sendCommit: (commit: Commit) => Promise<void>;
```

Defined in: [packages/collab-client/src/index.ts:37](https://github.com/handlewithcarecollective/pitter-patter/blob/3e3fc8d8788e696a4e61d9b08391ecafd2284c3f/packages/collab-client/src/index.ts#L37)

Sends local commits to a remote server to be merged into the remote document state.
The endpoint this function hits is defined by you, and should call the
CollabAuthority's [receiveCommit](https://pitter-patter.dev/docs/collab/reference/collab-server/classes/CollabAuthority#receivecommit)
function.

#### Parameters

##### commit

[`Commit`](/docs/collab/reference/collab-client/classes/Commit)

the latest prosemirror commit made by the local user

#### Returns

`Promise`\<`void`\>
