import { Insertable, Kysely, Transaction } from "kysely";

import { DB } from "./schema";

export async function getCommitByRef(db: Transaction<DB> | Kysely<DB>, docId: string, ref: string) {
  return await db
    .selectFrom("commit")
    .selectAll()
    .where("docId", "=", docId)
    .where("ref", "=", ref)
    .executeTakeFirst();
}

export async function getCommitsAfter(
  db: Transaction<DB> | Kysely<DB>,
  docId: string,
  version: number,
) {
  return await db
    .selectFrom("commit")
    .selectAll()
    .where("docId", "=", docId)
    .where("version", ">", version)
    .execute();
}

export async function createCommit(
  db: Transaction<DB> | Kysely<DB>,
  commit: Insertable<DB["commit"]>,
) {
  return await db.insertInto("commit").values(commit).execute();
}
