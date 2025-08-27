import { getDb } from "../src/database/db.ts";
import { defineConfig } from "kysely-ctl";

export default defineConfig({
  kysely: await getDb(),
});
