---
title: CollabClientConfig
---

# Interface: CollabClientConfig

Defined in:
[packages/collab-client/src/index.ts:22](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/collab-client/src/index.ts#L22)

## Properties

### listener

```ts
listener: CommitsListener;
```

Defined in:
[packages/collab-client/src/index.ts:37](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/collab-client/src/index.ts#L37)

A listener for remote commits.

Currently the only built-in option is the
[LongPollListener](/docs/collab/reference/collab-client/classes/LongPollListener).

---

### receiveCommits

```ts
receiveCommits: (commits: Commit[]) => void;
```

Defined in:
[packages/collab-client/src/index.ts:58](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/collab-client/src/index.ts#L58)

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

---

### sendCommit

```ts
sendCommit: (commit: Commit) => Promise<void>;
```

Defined in:
[packages/collab-client/src/index.ts:31](https://github.com/handlewithcarecollective/pitter-patter/blob/81896664a0707dea093e9edc81dae89a35a20ad2/packages/collab-client/src/index.ts#L31)

Sends local commits to a remote server to be merged into the remote document state. The endpoint
this function hits is defined by you, and should call the CollabAuthority's
[receiveCommit](https://pitter-patter.dev/docs/collab/reference/collab-server/classes/CollabAuthority#receivecommit)
function.

#### Parameters

##### commit

[`Commit`](/docs/collab/reference/collab-client/classes/Commit)

the latest prosemirror commit made by the local user

#### Returns

`Promise`\<`void`\>
