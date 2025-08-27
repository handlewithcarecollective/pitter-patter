import { Insertable, Updateable } from "kysely";
import { getDb } from "./db";
import { DB } from "./schema";

export async function getDoc(id: string) {
  const db = await getDb();
  return await db
    .selectFrom("doc")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirstOrThrow();
}

export async function updateDoc(id: string, update: Updateable<DB["doc"]>) {
  const db = await getDb();
  return await db.updateTable("doc").set(update).where("id", "=", id).execute();
}

export async function createDoc(doc: Insertable<DB["doc"]>) {
  const db = await getDb();
  return await db.insertInto("doc").values(doc).execute();
}
