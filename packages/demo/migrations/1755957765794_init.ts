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
    .addColumn("docId", "text", (col) =>
      col.notNull().references("doc.id").onDelete("cascade"),
    )
    .addColumn("ref", "text", (col) => col.notNull())
    .addColumn("version", "integer", (col) => col.notNull())
    .addUniqueConstraint("ref_doc_unique", ["docId", "ref"])
    .addUniqueConstraint("version_doc_unique", ["docId", "version"])
    .addColumn("steps", "text", (col) => col.notNull())
    .execute();
}

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("doc").execute();
  await db.schema.dropTable("commit").execute();
}
