import {
  CamelCasePlugin,
  Kysely,
  ParseJSONResultsPlugin,
  SqliteDialect,
} from "kysely";

import { DB } from "./schema";

let dbInstance: Kysely<DB> | null = null;

async function initializeDb(): Promise<Kysely<DB>> {
  if (dbInstance) {
    return dbInstance;
  }

  // Gross hack so that parcel doesn't try to bundle better-sqlite3
  const Database = eval("require")("better-sqlite3");
  const database = new Database(process.env["DATABASE_PATH"] ?? ":memory:");

  dbInstance = new Kysely<DB>({
    dialect: new SqliteDialect({
      database,
    }),
    plugins: [new CamelCasePlugin(), new ParseJSONResultsPlugin()],
  });

  return dbInstance;
}

export async function getDb(): Promise<Kysely<DB>> {
  return await initializeDb();
}
