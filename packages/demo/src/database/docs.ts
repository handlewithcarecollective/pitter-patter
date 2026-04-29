import { Insertable, Transaction, Updateable } from "kysely";
import { getDb } from "./db";
import { DB } from "./schema";

export async function getDoc(tr: Transaction<DB> | null, id: string) {
  const db = tr ?? (await getDb());
  return await db.selectFrom("doc").selectAll().where("id", "=", id).executeTakeFirstOrThrow();
}

export async function updateDoc(
  tr: Transaction<DB> | null,
  id: string,
  update: Updateable<DB["doc"]>,
) {
  const db = tr ?? (await getDb());
  return await db.updateTable("doc").set(update).where("id", "=", id).execute();
}

export async function createDoc(tr: Transaction<DB> | null, doc: Insertable<DB["doc"]>) {
  const db = tr ?? (await getDb());
  return await db.insertInto("doc").values(doc).execute();
}
