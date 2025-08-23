import express from "express";
import { renderRequest } from "@parcel/rsc/node";
import { Page } from "./Page.js";
import { CommitJSON } from "@pitter-patter/collab-client";
import {
  CollabAuthority,
  RedisBroadcastManager,
} from "@pitter-patter/collab-server";
import { schema } from "prosemirror-schema-basic";

// Create an Express app and serve the dist folder.
const app = express();
app.use("/client", express.static("dist/client"));
app.use(express.json());

// Create a route for the home page.
app.get("/", async (req, res) => {
  await renderRequest(req, res, <Page />, { component: Page });
});

const store = new Map<
  string,
  { doc: Record<string, unknown>; version: number; commits: CommitJSON[] }
>();

const broadcaster = new RedisBroadcastManager({
  redisUrl: "redis://localhost:6379",
});

const authority = new CollabAuthority({
  schema,
  getDoc: async (docId) => {
    const value = store.get(docId) ?? {
      doc: schema.nodes.doc.createAndFill()!.toJSON(),
      version: 0,
      commits: [] as CommitJSON[],
    };
    store.set(docId, value);
    return { docJSON: value.doc, version: value.version };
  },
  getCommit: async (docId, commitRef) => {
    const value = store.get(docId);
    if (!value) return null;
    return value.commits.find((commit) => commit.ref === commitRef) ?? null;
  },
  getCommits: async (docId, version) => {
    const value = store.get(docId);
    if (!value) return [];
    return value.commits.filter((commit) => commit.version > version);
  },
  saveDoc: async (docId, docJSON, version) => {
    const value = store.get(docId)!;
    value.doc = docJSON;
    value.version = version;
  },
  saveCommit: async (docId, commitJSON) => {
    const value = store.get(docId)!;
    value.commits.push(commitJSON);
  },
  broadcastCommit: broadcaster.broadcastCommit,
});

app.get("/api/docs/:docId/commits", async (req, res) => {
  const commits = await broadcaster.listenForCommit(
    req.params.docId,
    parseInt(req.query["version"] as string, 10),
  );
  res.status(200).send(commits);
});

app.post("/api/docs/:docId/commits", async (req, res) => {
  authority.receiveCommit(req.params.docId, req.body);
  res.send(null);
});

broadcaster.connect().then(() => {
  app.listen(3000, () => {
    console.log("Listening on port 3000");
  });
});
