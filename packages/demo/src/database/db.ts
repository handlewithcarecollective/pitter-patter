import { CamelCasePlugin, Kysely, ParseJSONResultsPlugin, SqliteDialect } from "kysely";

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
    log(event) {
      // console.log(event.query.sql)
      // console.log(event.query.parameters)
      // console.log(`Completed in ${event.queryDurationMillis}ms`)
      if (event.level === "error") {
        console.error(event.query.sql);
        console.error(event.error);
      }
    },
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
