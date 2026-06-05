---
title: Collab
---

TODO: Move to guides section and link to guide from collab and presence quick starts

Pitter Patter Collab adds collaborative editing to your existing prosemirror editor. It is designed
to plug into your existing system design, so you can add collaborative editing to your product,
while keeping all state in a database you own and trust.

We assume you have

1. A frontend application with a ProseMirror editor
2. A backend. This can be a server or a serverless deployment like Lambdas or Cloud Functions.
3. A database. Any database with ACID transactions should be compatible with Pitter Patter Collab.
   At this time, we have confirmed compatibility with Postgres, MySql, and Sqlite. If you are not
   using one of these databases, and still want to support collaborative editing, come talk to us.

In this tutorial, we will show how to make a prosemirror document collaborative

## The database

To begin, you need a database to hold your prosemirror editor state along with the commits made by
any editors of the document. You control the datastore that holds all editor state, and you can add
whatever you want to your data model, but Pitter Patter collab requires that the following pieces of
data be associated with each other:

### Documents

The latest committed version of the prosemirror editor state for a document. This must be associated
with a:

- **docId**: a unique identifier for the document. Your define this identifier. We recommend using a
  UUIDv4 as a best practice, but this is not strictly required
- **version**: an integer version number for the document. We provide the version number anytime the
  document is updated.

--Todo: Should last updated timestamp be added to this schema?

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
CREATE TABLE docs(
  id             UUID PRIMARY KEY,
  content        TEXT,
  doc_version    INTEGER
);

CREATE TABLE commits(
  id              UUID PRIMARY KEY,
  doc_id          UUID,
  doc_version     INTEGER,
  ref             TEXT,
  steps           TEXT
  CONSTRAINT unique_version UNIQUE(docId, doc_version)
);
```

## The backend

To set up your backend with Pitter Patter collab, you first create a CollabAuthority.
CollabAuthority is stateless, so you can create one in every server instance or function invocation
your backend uses. The CollabAuthority contains most of Pitter Patter's collaborative editing logic,
and requires a few inputs from you to work:

1. functions to interface with your database
2. a broadcast manager
3. your prosemirror schema

### Database interface functions

The CollabAuthority does not know anything about your database or datamodel. Instead, you provide it
the following set of functions that perform any required operations on your database

#### runWithTransaction

runWithTransaction receives a callback function that takes a transaction to your database starts a
transaction on your database, executes the callback with it, and commits the transaction.

If you are using Sqlite as a database, runWithTransaction should open a transaction with `BEGIN IMMEDIATE`.


```ts
runWithTransaction: <Result>(callback: (tr: Transaction) => Promise<Result>) => Promise<Result>;
```

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

#### saveDoc

Saves a document along with its docId, version, and lastUpdatedTimestamp to your database.

If a transaction `tr` is provided, it must be used for all database operations. If `tr` is null, all
database operations in this function should still be performed as an atomic unit.

```ts
import { type NodeJSON } from "@pitter-patter/collab-client";

saveDoc: (
  tr: Transaction | null,
  docId: string,
  docJSON: NodeJSON,
  version: number,
  lastUpdatedTimestamp: number,
) => Promise<void>;
```

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

#### getDoc

Retrieves a document from your database by docId. In addition to the document itself, the function returns the
version number and lastUpdateTimestamp for the document.

If you are using Postgres or MySql, getDoc should select the row holding the document with `SELECT FOR UPDATE`. This ensures that conflicting commits do not overwrite each other. We also recommend putting a unique constraint on the commit table for the fields docId and commit version.

If a transaction `tr` is provided, it must be used for all database operations. If `tr` is null, all
database operations in this function should still be performed as an atomic unit.

```ts
import { type NodeJSON } from "@pitter-patter/collab-client";

getDoc: (
  tr: Transaction | null,
  docId: string,
) => Promise<{
  docJSON: NodeJSON;
  version: number;
  lastUpdatedTimestamp: number;
}>;
```

```ts
const getDoc = async (tr, docId) => {
  const doc = await getDocument(tr, docId);
  return {
    docJSON: doc.content,
    version: doc.version,
    lastUpdatedTimestamp: new Date(doc.updatedAt + "Z").valueOf(),
  };
},
export async function getDocument(tr: Transaction<DB> | null, id: string) {
  const db = tr ?? (await getDb());
  return await db.selectFrom("doc").selectAll().where("id", "=", id).executeTakeFirstOrThrow();
}

```

#### saveCommit
Saves a commit along with its version and ref to your database.

If a transaction `tr` is provided, it must be used for all database operations. If `tr` is null, all database operations in this function should still be performed as an atomic unit.

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

#### getCommit

Given a docId and commitRef, retrieves the associated commit's steps and version from your database
and returns a joined CommitJSON object. Despite the name, CommitJSON is just a regular object with
fields for a commit's ref, version, and steps.

If a transaction `tr` is provided, it must be used for all database operations. If `tr` is null, all
database operations in this function should still be performed as an atomic unit.

```ts
import { type CommitJSON } from "@pitter-patter/collab-client";

getCommit: (
  tr: Transaction | null,
  docId: string,
  commitRef: string,
) => Promise<CommitJSON | null>;
```

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

#### getCommits:

For the provided docId, retrieves all commits from the database with a version number greater than,
`>`, the provided `version`. Despite the name, CommitJSON is just a regular object with fields for a
commit's ref, version, and steps.

```ts
import { type CommitJSON } from "@pitter-patter/collab-client";

getCommits: (
  tr: Transaction | null,
  docId: string,
  version: number,
) => Promise<CommitJSON[]>;
```

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


### Broadcast Manager

The broadcast manager sends and receives notifications to and from any listening clients on your
server. For now the only premade option is the RedisBroadcastManager, so we will set up the collab
server with it.

You need to run a redis instance that can be accessed by your server. Then all you need to create
the broadcast manager is the url to the instance. For example:

```ts
const broadcastManager = new RedisBroadcastManager({
  redisUrl: process.env["REDIS_URL"] ?? "redis://localhost:6379",
});
```

### Schema

This is just the schema for your prosemirror document.

### All together

With all of the required variables defined, we can create our server's CollabAuthority

```ts
const collabAuthority = new CollabAuthority<Transaction<DB>>(
  {
    runWithTransaction,
    getDoc,
    getCommit,
    getCommits,
    saveDoc,
    saveCommit,
    broadcastManager,
    schema,
  },
);
```

## Connecting the Client and Server

Your server now has a CollabAuthority that can interact with the editor state in your database and
send and receive update notifications. You now need to create endpoints that allow your frontend
clients to communicate with the CollabAuthority.

You need two endpoints. One to send commits to the CollabAuthority and one to listen for commits
from the CollabAuthority.

First, make a sendCommit endpoint that clients can send their local commits to. 

--Todo: We
should change the body sent by the collab client to be a json object with the commits set to one field This will allow adding fields in the future if necessary with minimal breaking changes

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
client side collabClient that we will define later and contains only the commit data.

In the body of this endpoint we:

1. submit the commit to the collabAuthority
2. return a 409 error if there is too much contention on the document
3. return a 204 success if the commit is written successfully.

The collabAuthority does the work of saving the new commit to the database and notifing any
listening clients of the changes.

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

The path of this endpoint is up to you. The only requirement is that the `docId`, `version` of the
latest document already received by the client are included in the request. We will construct this
request in the frontend collabClient below. In this example, we include the `docId` in the
endpoint's path and the latest `version` as a query parameter.

The function body just calls the collabAuthority's listenForCommit function and returns any commits
that are found. listenForCommit check for any new commits, and return if new commits are found.
If new commits are not immediately found, it listens for a new commit notification from the
BroadcastManager. If a notification is received, the commits are retrieved and returned immediately.
If no notification is received before a maximum timeout (eg. 15 seconds), an empty array is
returned.


-- Todo: find and specify where the timeout is configured

## Creating the client

You can now connect your frontend editor to the collab backend. PitterPatter's CollabClient manages synchronizing state between your frontend and backend.

First create an EditorState. In this example, we are using prosemirror's basic schema and are
starting with an empty document.

```ts
import { Node } from "prosemirror-model";
import { EditorState, Transaction } from "prosemirror-state";
import { schema } from "prosemirror-schema-basic";
import { collab } from "@pitter-patter/collab-client";
import { useState } from "react";
import { v4 as uuid } from "uuid";

const docId = uuid(); -- Todo: does this mess up the use memo call below?

const [state, setState] = useState(() =>
  EditorState.create({
    doc: Node.fromJSON(schema,  schema.nodes.doc.createAndFill()!), -- Todo: Make sure this line correctly make an empty document
    plugins: [collab({ version: 0 }), presence()],                  -- Todo: Also make sure the version number here is valid
  }),
);
```

Next we need to create a listener for commit changes. Currently the only supported listener is the
`LongPollListner`. It (long) polls the getCommits endpoint you implmented above. Support is planned
for direct connections to realtime databases like Firestore and Convex.

```ts
const [commitListener] = useState(
  () =>
    new LongPollListener(
      new URL(
        `/api/docs/${doc.id}/commits`,
        typeof window !== "undefined" ? window.location.href : "http://localhost:3000",
      ),
    ),
);
```

The LongPollListener also accepts optional headers to include in your request (an auth token for
example). These can be updated with the listener's `update` function. 

Next create a config for the CollabClient. The config contains the listener created above and two
functions that the CollabClient will use to interact with your backend and your local editor state,
sendCommit and receiveCommits.

* **sendCommit**: takes a new commit as an argument and sends it to the sendCommits endpoint you created
above.
* **receiveCommits**: takes an array of commits and merges them into your local editor state

```ts
const collabConfig = useMemo<CollabClientConfig>(
  () => ({
    sendCommit: async (commit) => {
      await fetch(`/api/docs/${docId}/commits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(commit.toJSON()),
      });
    },
    receiveCommits: (commits) => {
      setState((prev) =>
        commits.reduce(
          (acc, commit) => acc.apply(receiveCommitTransaction(acc, commit)),
          prev,
        ),
      );
    },
    listner: commitListener
  }),
  [docId, commitListener],
);
```

Then you create a CollabClient with the config. The collab client will automatically start listening for remote
commits.

```ts
const [collabClient] = useState(() => new CollabClient(collabConfig));
```

When the local editor state changes, you need to tell collabClient to create and send a new commit.

```ts
useEffect(() => {
  collabClient.send(state).catch((e) => console.error(e));
}, [collabClient, state]);
```

That's it! Your document can now be edited collaboratively by mulitiple simulatneous users.