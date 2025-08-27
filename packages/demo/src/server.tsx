import express from "express";
import { renderRequest } from "@parcel/rsc/node";
import { EditorPage } from "./editor/EditorPage.js";
import type { CommitJSON, NodeJSON } from "@pitter-patter/collab-client";
import {
  CollabAuthority,
  RedisBroadcastManager,
} from "@pitter-patter/collab-server";
import { schema } from "prosemirror-schema-basic";
import { Migrator } from "kysely";
import { TSFileMigrationProvider } from "kysely-ctl";
import { v7 as uuid } from "uuid";
import { getDb } from "./database/db.js";
import { createDoc, getDoc, updateDoc } from "./database/docs.js";
import { HomePage } from "./home/HomePage.js";
import { ComponentType } from "react";
import {
  createCommit,
  getCommitByRef,
  getCommitsAfter,
} from "./database/commits.js";

const app = express();
app.use("/client", express.static("dist/client"));
app.use(express.json());

app.get("/", async (req, res) => {
  await renderRequest(req, res, <HomePage />);
});

app.get("/editor/:docId", async (req, res) => {
  const doc = await getDoc(req.params.docId);
  await renderRequest(req, res, <EditorPage doc={doc} />, {
    component: EditorPage as ComponentType,
  });
});

const broadcaster = new RedisBroadcastManager({
  redisUrl: process.env["REDIS_URL"] ?? "redis://localhost:6379",
});

const authority = new CollabAuthority({
  schema,
  getDoc: async (docId) => {
    const doc = await getDoc(docId);
    return { docJSON: doc.content, version: doc.version };
  },
  getCommit: async (docId, commitRef) => {
    return (await getCommitByRef(docId, commitRef)) ?? null;
  },
  getCommits: async (docId, version) => {
    return await getCommitsAfter(docId, version);
  },
  saveDoc: async (docId, docJSON, version) => {
    await updateDoc(docId, {
      content: JSON.stringify(docJSON) as unknown as NodeJSON,
      version,
    });
  },
  saveCommit: async (docId, commitJSON) => {
    await createCommit({
      ...commitJSON,
      steps: JSON.stringify(commitJSON.steps) as unknown as CommitJSON["steps"],
      docId,
      id: uuid(),
    });
  },
  broadcastManager: broadcaster,
});

app.post("/api/docs", async (_, res) => {
  const docId = uuid();
  await createDoc({
    id: docId,
    version: 0,
    content: JSON.stringify(
      schema.nodes.doc.createAndFill()!.toJSON(),
    ) as unknown as NodeJSON,
  });

  res.status(303).setHeader("Location", `/editor/${docId}`).send();
});

app.get("/api/docs/:docId/commits", async (req, res) => {
  const commits = await authority.listenForCommit(
    req.params.docId,
    parseInt(req.query["version"] as string, 10),
  );
  res.status(200).send(commits);
});

app.post("/api/docs/:docId/commits", async (req, res) => {
  authority.receiveCommit(req.params.docId, req.body);
  res.send(null);
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
  await broadcaster.connect();

  app.listen(3000, () => {
    console.log("Listening on port 3000");
  });
}

startServer().catch(console.error);
