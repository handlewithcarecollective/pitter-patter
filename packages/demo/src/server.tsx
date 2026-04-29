import { renderRequest } from "@parcel/rsc/node";
import express from "express";
import { Migrator, Transaction } from "kysely";
import { TSFileMigrationProvider } from "kysely-ctl";
import { schema } from "prosemirror-schema-basic";
import { ComponentType } from "react";
import { v7 as uuid } from "uuid";

import { type CommitJSON, type NodeJSON } from "@pitter-patter/collab-client";
import {
  CollabAuthority,
  RedisBroadcastManager,
  TooMuchContentionError,
} from "@pitter-patter/collab-server";
import {
  PresenceAuthority,
  PresenceIndicator,
  RedisPresenceBroadcastManager,
  RedisPresencePersistenceManager,
} from "@pitter-patter/presence-server";
import { withVersionHistory } from "@pitter-patter/version-history-server";

import { createCommit, getCommitByRef, getCommitsAfter } from "./database/commits.js";
import { getDb } from "./database/db.js";
import { createDoc, getDoc, updateDoc } from "./database/docs.js";
import { DB } from "./database/schema.js";
import { createSnapshot, getLatestSnapshot, getSnapshots } from "./database/snapshots.js";
import { EditorPage } from "./editor/EditorPage.js";
import { HomePage } from "./home/HomePage.js";

const app = express();
app.use("/client", express.static("dist/client"));
app.use(express.json());

app.get("/", async (req, res) => {
  await renderRequest(req, res, <HomePage />);
});

app.get("/editor/:docId", async (req, res) => {
  const doc = await getDoc(null, req.params.docId);
  await renderRequest(req, res, <EditorPage doc={doc} />, {
    component: EditorPage as ComponentType,
  });
});

const collabBroadcaster = new RedisBroadcastManager({
  redisUrl: process.env["REDIS_URL"] ?? "redis://localhost:6379",
});

const collabAuthority = new CollabAuthority<Transaction<DB>>(
  withVersionHistory(
    {
      schema,
      runWithTransaction: async (callback) => {
        const db = await getDb();
        return await db.transaction().execute(callback);
      },
      getDoc: async (tr, docId) => {
        const doc = await getDoc(tr, docId);
        return {
          docJSON: doc.content,
          version: doc.version,
          lastUpdatedTimestamp: new Date(doc.updatedAt + "Z").valueOf(),
        };
      },
      getCommit: async (tr, docId, commitRef) => {
        return (await getCommitByRef(tr, docId, commitRef)) ?? null;
      },
      getCommits: async (tr, docId, version) => {
        return await getCommitsAfter(tr, docId, version);
      },
      saveDoc: async (tr, docId, docJSON, version) => {
        await updateDoc(tr, docId, {
          content: JSON.stringify(docJSON) as unknown as NodeJSON,
          version,
        });
      },
      saveCommit: async (tr, docId, commitJSON) => {
        await createCommit(tr, {
          ...commitJSON,
          steps: JSON.stringify(commitJSON.steps) as unknown as CommitJSON["steps"],
          docId,
          id: uuid(),
        });
      },
      broadcastManager: collabBroadcaster,
    },
    {
      getLatestSnapshot: async (tr, docId) => {
        const snapshot = await getLatestSnapshot(tr, docId);
        return {
          createdAt: new Date(snapshot.createdAt + "Z").valueOf(),
          snapshotId: snapshot.id,
          version: snapshot.version,
        };
      },
      createSnapshot: async (tr, docId, version, snapshotJSON) => {
        await createSnapshot(tr, {
          id: uuid(),
          docId,
          version,
          content: JSON.stringify(snapshotJSON) as unknown as NodeJSON,
        });
      },
      shouldCreateSnapshot: (
        currentTimestamp,
        lastUpdatedTimestamp,
        latestVersionCreatedTimestamp,
      ) => {
        const fifteenSecondsPause = currentTimestamp - lastUpdatedTimestamp > 15 * 1_000;
        const thirtySecondsEditing = currentTimestamp - latestVersionCreatedTimestamp > 30 * 1_000;
        return fifteenSecondsPause || thirtySecondsEditing;
      },
    },
  ),
);

const presenceBroadcaster = new RedisPresenceBroadcastManager({
  redisUrl: process.env["REDIS_URL"] ?? "redis://localhost:6379",
});

const presencePersister = new RedisPresencePersistenceManager({
  redisUrl: process.env["REDIS_URL"] ?? "redis://localhost:6379",
});

const presenceAuthority = new PresenceAuthority({
  persistenceManager: presencePersister,
  broadcastManager: presenceBroadcaster,
});

app.post("/api/docs", async (_, res) => {
  const docId = uuid();
  const content = JSON.stringify(schema.nodes.doc.createAndFill()!.toJSON()) as unknown as NodeJSON;
  await createDoc(null, {
    id: docId,
    version: 0,
    content,
  });
  await createSnapshot(null, {
    id: uuid(),
    docId,
    version: 0,
    content,
  });

  res.status(303).setHeader("Location", `/editor/${docId}`).send();
});

app.get("/api/docs/:docId/commits", async (req, res) => {
  const commits = await collabAuthority.listenForCommit(
    req.params.docId,
    parseInt(req.query["version"] as string, 10),
  );
  res.status(200).send(commits);
});

app.post("/api/docs/:docId/presence", async (req, res) => {
  const { refs, clientId } = req.body as {
    refs: Record<string, string> | undefined;
    clientId: string;
  };

  const presence = await presenceAuthority.listenForPresence(req.params.docId, clientId, refs);

  res.status(200).send(presence);
});

app.post("/api/docs/:docId/presence/:clientId", async (req, res) => {
  const indicator = req.body as PresenceIndicator;
  await presenceAuthority.updatePresence(req.params.docId, indicator);

  res.status(204).send(null);
});

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

app.get("/api/docs/:docId/snapshots", async (req, res) => {
  const version = req.query["version"] ? parseInt(req.query["version"] as string, 10) : undefined;
  const snapshots = await getSnapshots(null, req.params.docId, version);

  res.status(200).send(
    snapshots.map((snapshot) => ({
      snapshotId: snapshot.id,
      snapshotJSON: snapshot.content,
      docId: snapshot.docId,
      version: snapshot.version,
      createdAt: snapshot.createdAt,
    })),
  );
});

async function startServer() {
  const db = await getDb();

  const migrator = new Migrator({
    db,
    provider: new TSFileMigrationProvider({
      migrationFolder: `${process.cwd()}/migrations`,
    }),
  });

  const results = await migrator.migrateToLatest();
  if (results.error) {
    throw results.error;
  }
  await Promise.all([
    collabBroadcaster.connect(),
    presenceBroadcaster.connect(),
    presencePersister.connect(),
  ]);

  app.listen(3000, () => {
    console.log("Listening on port 3000");
  });
}

startServer().catch(console.error);
