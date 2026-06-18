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
