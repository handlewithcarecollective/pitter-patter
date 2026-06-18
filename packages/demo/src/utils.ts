export function randomRedisDatabaseIndex(): number {
  return Math.round(Math.random() * Number.MAX_SAFE_INTEGER);
}
