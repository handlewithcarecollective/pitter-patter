import { Insertable } from "kysely";
import { getDb } from "./db";
import { DB } from "./schema";

export async function getCommitByRef(docId: string, ref: string) {
  const db = await getDb();
  return await db
    .selectFrom("commit")
    .selectAll()
    .where("docId", "=", docId)
    .where("ref", "=", ref)
    .executeTakeFirst();
}

export async function getCommitsAfter(docId: string, version: number) {
  const db = await getDb();
  return await db
    .selectFrom("commit")
    .selectAll()
    .where("docId", "=", docId)
    .where("version", ">", version)
    .execute();
}

export async function createCommit(commit: Insertable<DB["commit"]>) {
  const db = await getDb();
  return await db.insertInto("commit").values(commit).execute();
}
