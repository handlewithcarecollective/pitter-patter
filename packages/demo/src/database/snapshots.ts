import { Insertable, Transaction } from "kysely";
import { getDb } from "./db";
import { DB } from "./schema";

export async function getLatestSnapshot(tr: Transaction<DB> | null, docId: string) {
  const db = tr ?? (await getDb());
  return await db
    .selectFrom("snapshot")
    .select(["id", "version", "createdAt"])
    .where("docId", "=", docId)
    .orderBy("version", "desc")
    .limit(1)
    .executeTakeFirstOrThrow();
}

export async function getSnapshots(
  tr: Transaction<DB> | null,
  docId: string,
  version?: number | undefined,
) {
  const db = tr ?? (await getDb());
  return await db
    .selectFrom("snapshot")
    .selectAll()
    .where("docId", "=", docId)
    .$if(version !== undefined, (qb) => qb.where("version", ">", version!))
    .orderBy("version", "asc")
    .execute();
}

export async function createSnapshot(tr: Transaction<DB> | null, doc: Insertable<DB["snapshot"]>) {
  const db = tr ?? (await getDb());
  return await db.insertInto("snapshot").values(doc).execute();
}
