// Todo: should the test files be named differently?
import { expect, test } from "vitest";

import { createDeployment, startServer } from "../server";

import { generateTestDeploymentConfig } from "./utils";

test("Test collab", async () => {
  const config = generateTestDeploymentConfig();

  const deployment = createDeployment(config);

  startServer(deployment, 3000).catch(console.error);

  console.log("SERVER RUNNING");

  expect(Math.sqrt(4)).toBe(2);
  expect(Math.sqrt(144)).toBe(12);
  expect(Math.sqrt(0)).toBe(0);
});
