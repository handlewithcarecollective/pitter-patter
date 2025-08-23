import { Kysely, SqliteDialect } from "kysely";
import Database from "better-sqlite3";

export const db = new Kysely({
  dialect: new SqliteDialect({
    database: new Database(process.env["DATABASE_PATH"]),
  }),
});
