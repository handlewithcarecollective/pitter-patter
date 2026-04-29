import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("doc")
    .addColumn("id", "text", (col) => col.primaryKey().notNull())
    .addColumn("content", "text", (col) => col.notNull())
    .addColumn("version", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("commit")
    .addColumn("id", "text", (col) => col.primaryKey().notNull())
    .addColumn("doc_id", "text", (col) => col.notNull().references("doc.id").onDelete("cascade"))
    .addColumn("ref", "text", (col) => col.notNull())
    .addColumn("version", "integer", (col) => col.notNull())
    .addUniqueConstraint("commit_ref_doc_unique", ["doc_id", "ref"])
    // IMPORTANT: We rely on this constraint to prevent simultaneous
    // writes from producing commits with the same version
    .addUniqueConstraint("commit_version_doc_unique", ["doc_id", "version"])
    .addColumn("steps", "text", (col) => col.notNull())
    .execute();
}

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("doc").execute();
  await db.schema.dropTable("commit").execute();
}
