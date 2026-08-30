import { Insertable, Kysely, Transaction, Updateable } from "kysely";

import { DB } from "./schema";

export async function getDoc(db: Transaction<DB> | Kysely<DB>, id: string) {
  return await db.selectFrom("doc").selectAll().where("id", "=", id).executeTakeFirstOrThrow();
}

export async function updateDoc(
  db: Transaction<DB> | Kysely<DB>,
  id: string,
  update: Updateable<DB["doc"]>,
) {
  return await db.updateTable("doc").set(update).where("id", "=", id).execute();
}

export async function createDoc(db: Transaction<DB> | Kysely<DB>, doc: Insertable<DB["doc"]>) {
  return await db.insertInto("doc").values(doc).execute();
}
