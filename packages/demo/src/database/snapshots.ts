import { Insertable, Kysely, Transaction } from "kysely";

import { DB } from "./schema";

export async function getLatestSnapshot(db: Transaction<DB> | Kysely<DB>, docId: string) {
  return await db
    .selectFrom("snapshot")
    .select(["id", "version", "createdAt"])
    .where("docId", "=", docId)
    .orderBy("version", "desc")
    .limit(1)
    .executeTakeFirstOrThrow();
}

export async function getSnapshots(
  db: Transaction<DB> | Kysely<DB>,
  docId: string,
  version?: number,
) {
  return await db
    .selectFrom("snapshot")
    .selectAll()
    .where("docId", "=", docId)
    .$if(version !== undefined, (qb) => qb.where("version", ">", version!))
    .orderBy("version", "asc")
    .execute();
}

export async function createSnapshot(
  db: Transaction<DB> | Kysely<DB>,
  doc: Insertable<DB["snapshot"]>,
) {
  return await db.insertInto("snapshot").values(doc).execute();
}
