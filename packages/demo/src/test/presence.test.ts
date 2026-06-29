import { Node } from "prosemirror-model";
import { schema } from "prosemirror-schema-basic";
import { EditorState } from "prosemirror-state";
// Todo: should the test files be named differently?
import { assert, expect, test } from "vitest";

import {
  NodeJSON,
  collab,
} from "@pitter-patter/collab-client";
import {
  PresenceClient,
  PresenceClientConfig,
  LongPollListener as PresenceLongPollListener,
  receivePresenceTransaction,
} from "@pitter-patter/presence-client";

import { getDoc } from "../database/docs";
import { randomRef } from "../editor/Editor";
import { createDeployment, startServer } from "../server-base";

import { createCollabClient, generateTestDeploymentConfig, sleep, StateBox } from "./utils";

const TEST_PORT = 10001;

interface Doc {
  content: NodeJSON;
  createdAt: string;
  id: string;
  updatedAt: string;
  version: number;
}

test("Test collab", async () => {
  const config = generateTestDeploymentConfig(1);

  const deployment = createDeployment(config);

  await startServer(deployment, TEST_PORT);

  const serverUrl = `http://localhost:${TEST_PORT}`;

  // Create an editor
  const createDocumentResponse = await fetch(`${serverUrl}/api/docs`, {
    method: "POST",
    redirect: "manual",
  });
  const docPath = createDocumentResponse.headers.get("location");
  assert(docPath);
  const docId = docPath.substring(8);

  const userId1 = randomRef();
  const doc1 = await getDoc(await deployment.db.getDb(), docId);
  const { client: _presenceClient1, stateBox: presenceStateBox1 } = await createPresenceClient(
    serverUrl,
    userId1,
    doc1,
  );
  const { client: collabClient1, stateBox: collabStateBox1 } = await createCollabClient(
    serverUrl,
    docId,
    doc1,
    "client1",
  );

  const userId2 = randomRef();
  const doc2 = await getDoc(await deployment.db.getDb(), docId);
  const { client: _presenceClient2, stateBox: presenceStateBox2 } = await createPresenceClient(
    serverUrl,
    userId2,
    doc2,
  );

  const tr = collabStateBox1.state.tr..insertText("hello");
  collabStateBox1.state = collabStateBox1.state.apply(tr);
  await collabClient1.send(collabStateBox1.state);

  // We could pass a channel into the client's receive function and await that instead
  // of using an arbitrary delay
  await sleep(500);

  expect(presenceStateBox1.state.doc.content).toStrictEqual(presenceStateBox2.state.doc.content);
});

async function createPresenceClient(
  serverUrl: string,
  userId: string,
  doc: Doc,
): Promise<{ client: PresenceClient; stateBox: StateBox }> {
  const presenceListener = new PresenceLongPollListener(
    new URL(`${serverUrl}/api/docs/${doc.id}/presence`),
  );

  const stateBox = {
    state: EditorState.create({
      doc: Node.fromJSON(schema, doc.content),
      plugins: [collab({ version: doc.version })],
    }),
  };

  const presenceConfig: PresenceClientConfig = {
    userId,
    sendIndicator: async (clientId, indicator) => {
      await fetch(`${serverUrl}/api/docs/${doc.id}/presence/${clientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(indicator),
      });
    },
    receiveIndicators: (indicators) => {
      // Todo: Something seems redundant about this line in presence and collab. Why
      //       do we have to call apply on state and pass it to the receive transaction function?
      stateBox.state = stateBox.state.apply(receivePresenceTransaction(stateBox.state, indicators));
    },
    listener: presenceListener,
  };

  const client = new PresenceClient(presenceConfig);
  client.listen();

  return { client, stateBox };
}
