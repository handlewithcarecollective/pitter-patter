import { Node } from "prosemirror-model";
import { schema } from "prosemirror-schema-basic";
import { EditorState } from "prosemirror-state";
// Todo: should the test files be named differently?

import {
  LongPollListener as CollabLongPollListener,
  CollabClient,
  CollabClientConfig,
  NodeJSON,
  receiveCommitTransaction,
  collab,
} from "@pitter-patter/collab-client";

import { DemoDeploymentConfig } from "../server-base";


// function randomRedisDatabaseIndex(): number {
//   return Math.round(Math.random() * 2147483647);
// }

export function generateTestDeploymentConfig(redisDbIndex: number): DemoDeploymentConfig {
  return {
    sqlitePath: ":memory:",
    redisDbIndex: redisDbIndex,
    redisChannelPrefix: crypto.randomUUID(),
    id: crypto.randomUUID(),
  };
}

export async function sleep(millis: number) {
  await new Promise<void>((resolve) => {
    setTimeout(() => resolve(), millis);
  });
}

export interface StateBox {
  state: EditorState;
}

export interface Doc {
  content: NodeJSON;
  createdAt: string;
  id: string;
  updatedAt: string;
  version: number;
}

export async function createCollabClient(
  serverUrl: string,
  docId: string,
  doc: Doc,
  tag: string,
): Promise<{ client: CollabClient; stateBox: StateBox }> {
  const stateBox = {
    state: EditorState.create({
      doc: Node.fromJSON(schema, doc.content),
      plugins: [collab({ version: doc.version })],
    }),
  };

  const clientConfig: CollabClientConfig = {
    sendCommit: async (commit) => {
      await fetch(`${serverUrl}/api/docs/${docId}/commits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(commit.toJSON()),
      });
    },
    listener: new CollabLongPollListener(new URL(`${serverUrl}/api/docs/${docId}/commits`)),
    receiveCommits: (commits) => {
      console.log(`${tag}: RECEIVING COMMITS`);
      for (const commit of commits) {
        stateBox.state = stateBox.state.apply(receiveCommitTransaction(stateBox.state, commit));
      }
    },
  };
  const client = new CollabClient(clientConfig);
  client.listen(stateBox.state);

  return { client, stateBox };
}
