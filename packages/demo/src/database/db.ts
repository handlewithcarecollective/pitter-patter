import { CamelCasePlugin, Kysely, ParseJSONResultsPlugin, SqliteDialect } from "kysely";

import { DB } from "./schema";

export class SqliteInstance {
  private dbPath: string;
  private dbInstance: Kysely<DB> | null;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    this.dbInstance = null;
  }

  private async initializeDb(): Promise<Kysely<DB>> {
    // Gross hack so that parcel doesn't try to bundle better-sqlite3
    // oxlint-disable-next-line no-eval
    const Database = eval("require")("better-sqlite3");
    const database = new Database(this.dbPath);

    this.dbInstance = new Kysely<DB>({
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

    return this.dbInstance;
  }

  async getDb(): Promise<Kysely<DB>> {
    if (this.dbInstance) {
      return this.dbInstance;
    }
    return await this.initializeDb();
  }
}
