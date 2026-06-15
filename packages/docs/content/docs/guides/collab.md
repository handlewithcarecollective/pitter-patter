---
title: Collab
---

In this tutorial, we will show how to make a Prosemirror document collaborative with Pitter Patter
Collab.

Collab is designed to plug into your existing editor and system design, so you can add collaborative
editing to your product, while keeping all state in a database you own and trust.

We assume you have

1. A frontend application with a ProseMirror editor
2. A backend. This can be a server or a serverless deployment like Lambdas or Cloud Functions.
3. A database. Any database with ACID transactions should be compatible with Pitter Patter Collab.
   At this time, we have confirmed compatibility with Postgres, MySql, and Sqlite. If you are not
   using one of these databases, and still want to support collaborative editing, come talk to us.
4. A Redis instance

## The database

To begin, you need a database to hold your document's Prosemirror editor state along with the
commits made by anyone editting the document. You control the datastore that holds all editor state,
and you can add whatever you want to your data model, but Pitter Patter collab requires that the
following pieces of data be associated with each other:

### Documents

The latest committed version of the Prosemirror editor state for a document. This must be associated
with a:

- **docId**: a unique identifier for the document. Your define this identifier. We recommend using a
  UUIDv4 as a best practice, but this is not strictly required
- **version**: an integer version number for the document. We provide the version number anytime the
  document is updated.
- **lastUpdatedTimestamp**: the timestamp of the last document update.

### Commits

The set of changes committed to the document. Each commit must be associated with a:

- **docId**: The id of the document the commit is applied to
- **commitRef**: A unique string identifier for the commit. We create this ref and give it to you
  when you save the commit to your database.
- **versionNumber**: an integer version for the commit. We provide the version anytime a commit is
  saved

### Example Schema

In this tutorial, we will use a postgres database with the following schema as an example.

```sql
CREATE TABLE doc(
  id             UUID PRIMARY KEY,
  content        TEXT,
  version        INTEGER,
  updated_at     TEXT
);

CREATE TABLE commit(
  id              UUID PRIMARY KEY,
  doc_id          UUID,
  version         INTEGER,
  ref             TEXT,
  steps           TEXT,
  CONSTRAINT unique_version UNIQUE(doc_id, version)
);
```

We will also add a trigger to the doc table to keep the updated_at field up to date.

```sql
CREATE TRIGGER doc_trigger AFTER
UPDATE ON doc FOR EACH ROW BEGIN
UPDATE doc
SET
  updated_at = CURRENT_TIMESTAMP
WHERE
  id = OLD.id;
END;
```

And add indexes that we will need for row retrieval in a moment

```sql
CREATE INDEX commits_ref_idx ON commits (doc_id, ref);
CREATE INDEX commits_version_idx ON commits (doc_id, version);
```

## The backend

To set up your backend with Pitter Patter collab, you first create a
[CollabAuthority](https://pitter-patter.dev/docs/collab/reference/collab-server/classes/CollabAuthority).
[CollabAuthority](https://pitter-patter.dev/docs/collab/reference/collab-server/classes/CollabAuthority)
is stateless, so you can create one in every server instance or function invocation your backend
uses. The
[CollabAuthority](https://pitter-patter.dev/docs/collab/reference/collab-server/classes/CollabAuthority)
contains most of Pitter Patter's collaborative editing logic, and requires a few inputs from you to
work:

1. functions to interface with your database
2. a broadcast manager
3. your Prosemirror schema

### Database interface functions

The
[CollabAuthority](https://pitter-patter.dev/docs/collab/reference/collab-server/classes/CollabAuthority)
does not know anything about your database or data model. Instead, you provide it the following set
of functions that perform any required operations on your database

#### [runWithTransaction](https://pitter-patter.dev/docs/collab/reference/collab-server/interfaces/CollabAuthorityConfig#runwithtransaction)

runWithTransaction should start a transaction on your database, executes the provided callback with
it, and commit the transaction.

If you are using Sqlite as a database, runWithTransaction should open a transaction with
`BEGIN IMMEDIATE`.

```ts
// any database library can be used, as long as it has a consistent transaction
// type. In our demo, we use Kysely.
import { Kysely } from "kysely";

// helper function to return an initialized database client
export async function getDb(): Promise<Kysely<DB>> {
  // return the database client of your choice
}

const runWithTransaction = async (callback) => {
  const db = await getDb();
  return await db.transaction().execute(callback);
};
```

#### [saveDoc](https://pitter-patter.dev/docs/collab/reference/collab-server/interfaces/CollabAuthorityConfig#savedoc)

Saves a document along with its docId, version, and lastUpdatedTimestamp to your database.

If a transaction `tr` is provided, it must be used for all database operations. If `tr` is null, all
database operations in this function should still be performed as an atomic unit.

```ts
const saveDoc = async (tr, docId, docJSON, version) => {
  await updateDoc(tr, docId, {
    content: JSON.stringify(docJSON) as unknown as NodeJSON,
    version,
  });
};

export async function updateDoc(
  tr: Transaction<DB> | null,
  id: string,
  update: Updateable<DB["doc"]>,
) {
  const db = tr ?? (await getDb());
  return await db.updateTable("doc").set(update).where("id", "=", id).execute();
}
```

#### [getDoc](https://pitter-patter.dev/docs/collab/reference/collab-server/interfaces/CollabAuthorityConfig#getdoc)

Retrieves a document from your database by docId. In addition to the document itself, the function
returns the version number and lastUpdateTimestamp for the document.

If you are using Postgres or MySql, getDoc should select the row holding the document with
`SELECT FOR UPDATE`. This ensures that conflicting commits do not overwrite each other. We also
recommend putting a unique constraint on the commit table for the fields docId and commit version.

If a transaction `tr` is provided, it must be used for all database operations. If `tr` is null, all
database operations in this function should still be performed as an atomic unit.

```ts
const getDoc = async (tr, docId) => {
  const doc = await getDocument(tr, docId);
  return {
    docJSON: doc.content,
    version: doc.version,
    lastUpdatedTimestamp: new Date(doc.updatedAt + "Z").valueOf(),
  };
};

export async function getDocument(tr: Transaction<DB> | null, id: string) {
  const db = tr ?? (await getDb());
  return await db.selectFrom("doc").selectAll().where("id", "=", id).executeTakeFirstOrThrow();
}
```

#### [saveCommit](https://pitter-patter.dev/docs/collab/reference/collab-server/interfaces/CollabAuthorityConfig#savecommit)

Saves a commit along with its version and ref to your database.

If a transaction `tr` is provided, it must be used for all database operations. If `tr` is null, all
database operations in this function should still be performed as an atomic unit.

```ts
const saveCommit = async (tr, docId, commitRef, commitVersion, commitSteps) => {
  await createCommit(tr, {
    ref: commitRef,
    version: commitVersion,
    steps: JSON.stringify(commitSteps) as unknown as CommitJSON["steps"],
    docId,
    id: uuid(),
  });
};

export async function createCommit(tr: Transaction<DB> | null, commit: Insertable<DB["commit"]>) {
  const db = tr ?? (await getDb());
  return await db.insertInto("commit").values(commit).execute();
}
```

#### [getCommit](https://pitter-patter.dev/docs/collab/reference/collab-server/interfaces/CollabAuthorityConfig#getcommit)

Given a docId and commitRef, retrieves the associated commit's steps and version from your database
and returns a joined CommitJSON object.

If a transaction `tr` is provided, it must be used for all database operations. If `tr` is null, all
database operations in this function should still be performed as an atomic unit.

```ts
const getCommit = async (tr, docId, commitRef) => {
  return (await getCommitByRef(tr, docId, commitRef)) ?? null;
};

export async function getCommitByRef(tr: Transaction<DB> | null, docId: string, ref: string) {
  const db = tr ?? (await getDb());
  return await db
    .selectFrom("commit")
    .selectAll()
    .where("docId", "=", docId)
    .where("ref", "=", ref)
    .executeTakeFirst();
}
```

#### [getCommits](https://pitter-patter.dev/docs/collab/reference/collab-server/interfaces/CollabAuthorityConfig#getcommits)

For the provided docId, retrieves all commits from the database with a version number greater than,
`>`, the provided `version`.

```ts
const getCommits = async (tr, docId, version) => {
  return await getCommitsAfter(tr, docId, version);
};

export async function getCommitsAfter(tr: Transaction<DB> | null, docId: string, version: number) {
  const db = tr ?? (await getDb());
  return await db
    .selectFrom("commit")
    .selectAll()
    .where("docId", "=", docId)
    .where("version", ">", version)
    .execute();
}
```

### [Broadcast Manager](https://pitter-patter.dev/docs/collab/reference/collab-server/interfaces/CollabAuthorityConfig#broadcastmanager)

The broadcast manager sends and receives notifications to and from any listening clients on your
server. For now the only built-in option is the
[RedisBroadcastManager](https://pitter-patter.dev/docs/collab/reference/collab-server/classes/RedisBroadcastManager/),
so we will set up the collab server with it.

```ts
const broadcastManager = new RedisBroadcastManager({
  redisUrl: process.env["REDIS_URL"] ?? "redis://localhost:6379",
});
```

### [Schema](https://pitter-patter.dev/docs/collab/reference/collab-server/interfaces/CollabAuthorityConfig#schema)

This is just the schema for your Prosemirror document.

### All together

With all of the required variables defined, we can create our server's
[CollabAuthority](https://pitter-patter.dev/docs/collab/reference/collab-server/classes/CollabAuthority)

```ts
const collabAuthority = new CollabAuthority<Transaction<DB>>({
  runWithTransaction,
  getDoc,
  getCommit,
  getCommits,
  saveDoc,
  saveCommit,
  broadcastManager,
  schema,
});
```

## Connecting the Client and Server

Your server now has a
[CollabAuthority](https://pitter-patter.dev/docs/collab/reference/collab-server/classes/CollabAuthority)
that can interact with the editor state in your database and send and receive update notifications.
You now need to create endpoints that allow your frontend clients to communicate with the
[CollabAuthority](https://pitter-patter.dev/docs/collab/reference/collab-server/classes/CollabAuthority).

You need two endpoints. One to send commits to the
[CollabAuthority](https://pitter-patter.dev/docs/collab/reference/collab-server/classes/CollabAuthority)
and one to listen for commits from the
[CollabAuthority](https://pitter-patter.dev/docs/collab/reference/collab-server/classes/CollabAuthority).

First, make a sendCommit endpoint that clients can send their local commits to.

```ts
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
```

The path of this endpoint is up to you. The only requirement is that the docId associated with the
commits is included in the path or as a query parameter. The body of the request is defined by the
client side
[CollabClient](https://pitter-patter.dev/docs/collab/reference/collab-client/classes/CollabClient)
that we will define later and contains only the commit data.

In the body of this endpoint we:

1. submit the commit to the
   [CollabAuthority](https://pitter-patter.dev/docs/collab/reference/collab-server/classes/CollabAuthority)
2. return a 409 error if there is too much contention on the document
3. return a 204 success if the commit is written successfully.

The
[CollabAuthority](https://pitter-patter.dev/docs/collab/reference/collab-server/classes/CollabAuthority)
does the work of saving the new commit to the database and notifing any listening clients of the
changes.

Next make a getCommits endpoint where clients can listen for remote changes.

```ts
app.get("/api/docs/:docId/commits", async (req, res) => {
  const commits = await collabAuthority.listenForCommit(
    req.params.docId,
    parseInt(req.query["version"] as string, 10),
  );
  res.status(200).send(commits);
});
```

The path of this endpoint is up to you. The only requirement is that the `docId` and `version` of
the latest document already received by the client are included in the request. We will construct
this request in the frontend
[CollabClient](https://pitter-patter.dev/docs/collab/reference/collab-client/classes/CollabClient)
below. In this example, we include the `docId` in the endpoint's path and the latest `version` as a
query parameter.

The function body just calls the CollabAuthority's listenForCommit function and returns any commits
that are found. listenForCommit check for any new commits, and return if new commits are found. If
new commits are not immediately found, it listens for a new commit notification from the
BroadcastManager. If a notification is received, the commits are retrieved and returned immediately.
If no notification is received before a maximum
[timeout](https://pitter-patter.dev/docs/collab/reference/collab-server/interfaces/RedisBroadcastManagerConfig/#timeout)
(eg. 15 seconds), an empty array is returned.

## Creating the client

You can now connect your frontend editor to the collab backend. PitterPatter's
[CollabClient](https://pitter-patter.dev/docs/collab/reference/collab-client/classes/CollabClient)
manages synchronizing state between your frontend and backend.

First create an EditorState. In this example, we are using Prosemirror's basic schema and are
starting with an empty document.

```ts
import { EditorState } from "prosemirror-state";
import { collab } from "@pitter-patter/collab-client";

const state = EditorState.create({
  doc: // your initial prosemirror schema and document
  plugins: [collab({ version: /* the initial version number for your document */ })],
})
```

Next we need to create a listener for commit changes. The built-in
[LongPollListener](https://pitter-patter.dev/docs/collab/reference/collab-client/classes/LongPollListener)
(long) polls the getCommits endpoint you implmented above for those changes.

```ts
import { LongPollListener as CollabLongPollListener } from "@pitter-patter/collab-client";

const commitListener = new CollabLongPollListener(
  new URL(
    `/api/docs/${doc.id}/commits`,
    typeof window !== "undefined" ? window.location.href : "http://localhost:3000",
  ),
);
```

The
[LongPollListener](https://pitter-patter.dev/docs/collab/reference/collab-client/classes/LongPollListener)
also accepts optional headers to include in your request (an auth token for example). These can be
updated with the listener's
[update](https://pitter-patter.dev/docs/collab/reference/collab-client/classes/LongPollListener#update)
function.

Next create a config for the
[CollabClient](https://pitter-patter.dev/docs/collab/reference/collab-client/classes/CollabClient).
The config contains the listener created above and two functions that the
[CollabClient](https://pitter-patter.dev/docs/collab/reference/collab-client/classes/CollabClient)
will use to interact with your backend and your local editor state, sendCommit and receiveCommits.

- **sendCommit**: takes a new commit as an argument and sends it to the sendCommits endpoint you
  created above.
- **receiveCommits**: takes an array of commits and merges them into your local editor state

```ts
import { CollabClientConfig, receiveCommitTransaction } from "@pitter-patter/collab-client";

const collabConfig = {
  sendCommit: async (commit) => {
    await fetch(`/api/docs/${docId}/commits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(commit.toJSON()),
    });
  },
  receiveCommits: (commits) => {
    // merge a new set of commits into your editor state for example:
    // const newEditorState = commits.reduce((acc, commit) => acc.apply(receiveCommitTransaction(acc, commit)), oldEditorState),
  },
  listener: commitListener,
};
```

Then you create a
[CollabClient](https://pitter-patter.dev/docs/collab/reference/collab-client/classes/CollabClient)
with the config and tell it to start listening for updates

```ts
const collabClient = new CollabClient(collabConfig);
const abortController = new AbortController();
collabClient.listen(initialState, abortController.signal).catch((e) => console.error(e));
```

When the local editor state changes, you need to tell collabClient to create and send a new commit.

```ts
collabClient.send(state).catch((e) => console.error(e));
```

That's it! Your document can now be edited collaboratively by mulitiple simultaneous users.
