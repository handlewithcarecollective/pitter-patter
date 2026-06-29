// Todo: should the test files be named differently?
import { assert, expect, test } from "vitest";

import { getDoc } from "../database/docs";
import { createDeployment, startServer } from "../server-base";

import { createCollabClient, generateTestDeploymentConfig, sleep } from "./utils";

const TEST_PORT = 10001;

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
  const doc1 = await getDoc(await deployment.db.getDb(), docId);
  const doc2 = await getDoc(await deployment.db.getDb(), docId);

  const { client: client1, stateBox: stateBox1 } = await createCollabClient(serverUrl, docId, doc1);
  const { client: _client2, stateBox: stateBox2 } = await createCollabClient(
    serverUrl,
    docId,
    doc2,
  );

  const tr = stateBox1.state.tr.insertText("hello");
  stateBox1.state = stateBox1.state.apply(tr);
  await client1.send(stateBox1.state);

  // We could pass a channel into the client's receive function as well
  await sleep(500);

  const expectedContent = [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "hello",
        },
      ],
    },
  ];
  expect(stateBox1.state.doc.content.toJSON()).toStrictEqual(expectedContent);
});
