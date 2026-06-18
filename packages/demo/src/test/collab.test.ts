// Todo: should the test files be named differently?
import { expect, test } from "vitest";
import randomRedisDatabaseIndex from "../utils";

test("Test collab", async () => {
  const sqlitePath = ":memory:"
  const redisDbIndex = 
  // const redisChannelPrefix = 
  const config: DemoDeploymentConfig = {
    sqlitePath, 
    redisDbIndex: randomRedisDatabaseIndex();
    redisChannelPrefix: crypto.randomUUID();
  }

  // Todo create sqlitedb

  // Todo: create deployment

  expect(Math.sqrt(4)).toBe(2);
  expect(Math.sqrt(144)).toBe(12);
  expect(Math.sqrt(0)).toBe(0);

});
