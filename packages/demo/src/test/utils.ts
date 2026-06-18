import { DemoDeploymentConfig } from "../server";

function randomRedisDatabaseIndex(): number {
  return Math.round(Math.random() * Number.MAX_SAFE_INTEGER);
}

export function generateTestDeploymentConfig(): DemoDeploymentConfig {
  return {
    sqlitePath: ":memory:",
    redisDbIndex: randomRedisDatabaseIndex(),
    redisChannelPrefix: crypto.randomUUID(),
  };
}
