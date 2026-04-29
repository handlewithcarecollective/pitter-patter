import { Insertable, Transaction } from "kysely";

import { getDb } from "./db";
import { DB } from "./schema";

export async function getCommitByRef(tr: Transaction<DB> | null, docId: string, ref: string) {
  const db = tr ?? (await getDb());
  return await db
    .selectFrom("commit")
    .selectAll()
    .where("docId", "=", docId)
    .where("ref", "=", ref)
    .executeTakeFirst();
}

export async function getCommitsAfter(tr: Transaction<DB> | null, docId: string, version: number) {
  const db = tr ?? (await getDb());
  return await db
    .selectFrom("commit")
    .selectAll()
    .where("docId", "=", docId)
    .where("version", ">", version)
    .execute();
}

export async function createCommit(tr: Transaction<DB> | null, commit: Insertable<DB["commit"]>) {
  const db = tr ?? (await getDb());
  return await db.insertInto("commit").values(commit).execute();
}
