import { TextSelection } from "prosemirror-state";
// Todo: should the test files be named differently?
import { assert, expect, test } from "vitest";

import { presenceKey } from "@pitter-patter/presence-client";

import { getDoc } from "../database/docs";
import { randomRef } from "../editor/Editor";
import { createDeployment, startServer } from "../server-base";

import {
  createCollabClient,
  createPresenceClient,
  generateTestDeploymentConfig,
  sleep,
} from "./utils";

const TEST_PORT = 10002;

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
  const { client: collabClient1, stateBox: stateBox1 } = await createCollabClient(
    serverUrl,
    docId,
    doc1,
  );
  const { client: presenceClient1 } = await createPresenceClient(
    serverUrl,
    userId1,
    doc1,
    stateBox1,
  );

  const userId2 = randomRef();
  const doc2 = await getDoc(await deployment.db.getDb(), docId);
  const { client: _collabClient2, stateBox: stateBox2 } = await createCollabClient(
    serverUrl,
    docId,
    doc2,
  );
  const { client: _presenceClient2 } = await createPresenceClient(
    serverUrl,
    userId2,
    doc2,
    stateBox2,
  );

  const collabTr = stateBox1.state.tr.insertText("hello");
  stateBox1.state = stateBox1.state.apply(collabTr);
  await collabClient1.send(stateBox1.state);

  // We could pass a channel into the client's receive function and await that instead
  // of using an arbitrary delay
  await sleep(500);

  const presenceTr = stateBox1.state.tr.setSelection(TextSelection.create(stateBox1.state.doc, 2));
  stateBox1.state = stateBox1.state.apply(presenceTr);
  await presenceClient1.send(stateBox1.state);

  await sleep(500);

  const presenceState = presenceKey.getState(stateBox2.state);
  let indicatorArr = presenceState?.indicators[presenceClient1.getClientId()];
  if (!indicatorArr || !indicatorArr[0]) {
    throw "Indicators not found";
  }
  const indicator = indicatorArr[0];
  expect(indicator.anchor).toBe(2);
  expect(indicator.head).toBe(2);
});
