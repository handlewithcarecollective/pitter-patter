import { db } from "../src/database/db.ts";
import { defineConfig } from "kysely-ctl";

export default defineConfig({
  kysely: db,
  //   migrations: {
  //     migrationFolder: "migrations",
  //   },
  //   plugins: [],
  //   seeds: {
  //     seedFolder: "seeds",
  //   }
});
