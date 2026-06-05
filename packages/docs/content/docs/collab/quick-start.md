---
title: Quick start
description: Install and configure Collab
---

This quick start provides a summary of a Pitter Patter Collab configuration. For a more in depth
explanation, see the [Collab Guide](https://pitter-patter.dev/docs/guides/collab/).

## Configure your backend

```npm
npm i @pitter-patter/collab-server
```

To set up your backend with Pitter Patter collab, you first create a
[CollabAuthority](https://pitter-patter.dev/docs/collab/reference/collab-server/classes/CollabAuthority).
The code below assumes that you have

1. a database with support for ACID transactions
2. a Redis cluster accessible at `REDIS_URL`
3. a prosemirror editor schema, `schema`.

```ts
import {
  CollabAuthority,
  RedisBroadcastManager,
  TooMuchContentionError
} from "@pitter-patter/collab-server";

const collabAuthority = new CollabAuthority<Transaction<DB>>(
  {
    runWithTransaction: async (callback) => {
      // start a transaction on your database and execute `callback` within it
    },
    getDoc: async (tr, docId) => {
      // Get the prosemirror document by docId from your database using the
      // transaction `tr` if provided.
    },
    getCommit: async (tr, docId, commitRef) => {
      // Get the commit with the given docId and commitRef from your database
      // using the transaction `tr` if provided.
    },
    getCommits: async (tr, docId, version) => {
      // Get all commit with the given docId whose version is strictly greater
      // than `version` from your database using the transaction `tr` if provided.
    },
    saveDoc: async (tr, docId, docJSON, version) => {
      // Update the document state and version for `docId` in your databse using
      // the transaction `tr` if provided.
    },
    saveCommit: async (tr, docId, commitRef, commitVersion, commitSteps) => {
      // Insert the commit for `docId` in your databse using the transaction `tr`
      // if provided.
    },
    broadcastManager: new RedisBroadcastManager({
      redisUrl: process.env["REDIS_URL"],
    }),
    schema,
  }
```

Next, create two endpoints. One for clients to submit commits on a document and one for clients to
listen for commits on a document.

```ts
// Endpoint that clients will use to send commits to the CollabAuthority
app.post("/api/docs/:docId/commits", async (req, res) => {
  try {
    await collabAuthority.receiveCommit(req.params.docId, req.body);
  } catch (e) {
    if (e instanceof TooMuchContentionError) {
      res.status(409).send(null);
      return;
    }
    throw e;
  }
  res.status(204).send(null);
});

// Endpoint that clients will use to listen for commits from the CollabAuthority
app.get("/api/docs/:docId/commits", async (req, res) => {
  const commits = await collabAuthority.listenForCommit(
    req.params.docId,
    parseInt(req.query["version"] as string, 10),
  );
  res.status(200).send(commits);
});
```

## Configure your frontend

```npm
npm i @pitter-patter/collab-client
```

To configure your frontend editor with Collab, you first add the collab plugin when creating your
editor state

```ts
import { EditorState } from "prosemirror-state";
import { collab } from "@pitter-patter/collab-client";

const document = await fetch(`/api/docs/${docId}`).then((r) => r.json())

const state = EditorState.create({
  doc: Node.fromJSON(schema, document.content)
  plugins: [collab({ version: document.version })],
})
```

Then create a
[CollabClient](https://pitter-patter.dev/docs/collab/reference/collab-client/classes/CollabClient).
This client uses the endpoints you created above to send and listen for commits.

```ts
// The LongPollListener listens for document changes at the GET
// endpoint `/api/docs/:docId/commits` you created above
const longPollListner = new LongPollListener(
  new URL(
    `/api/docs/${doc.id}/commits`,
    typeof window !== "undefined" ? window.location.href : "http://localhost:3000",
  ),
);

const collabClient = new CollabClient({
  sendCommit: async (commit) => {
    // send `commit` to the POST endpoint `/api/docs/:docId/commits` you created above
  },
  receiveCommits: (commits) => {
    // merge a new set of commits into your editor state for example:
    // const newEditorState = commits.reduce((acc, commit) => acc.apply(receiveCommitTransaction(acc, commit)), oldEditorState),
  },
  listner: commitListener,
});
```

Tell the client to start listening for changes

```ts
const abortController = new AbortController();
collabClient.listen(initialState, abortController.signal).catch((e) => console.error(e));
```

When the local editor state changes, you need to tell the
[CollabClient](https://pitter-patter.dev/docs/collab/reference/collab-client/classes/CollabClient)
to create and send a new commit.

```ts
collabClient.send(state).catch((e) => console.error(e));
```
