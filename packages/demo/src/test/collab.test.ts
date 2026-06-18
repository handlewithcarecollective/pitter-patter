// Todo: should the test files be named differently?
import { expect, test } from "vitest";

import { createDeployment, startServer } from "../server-base";

import { generateTestDeploymentConfig } from "./utils";

const TEST_PORT = 10000;

test("Test collab", async () => {
  const config = generateTestDeploymentConfig(1);
  console.log(`test1 id: ${config.id}`);

  const deployment = createDeployment(config);

  await startServer(deployment, TEST_PORT).catch(console.error);

  console.log("SERVER RUNNING");
  await new Promise<void>((resolve) => {
    setTimeout(() => resolve(), 300000000);
  });

  expect(Math.sqrt(4)).toBe(2);
  expect(Math.sqrt(144)).toBe(12);
  expect(Math.sqrt(0)).toBe(0);
}, 1000000);
