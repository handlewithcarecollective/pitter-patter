import { defineConfig } from "kysely-ctl";

import { getDb } from "../src/database/db.ts";

export default defineConfig({
  kysely: await getDb(),
});
