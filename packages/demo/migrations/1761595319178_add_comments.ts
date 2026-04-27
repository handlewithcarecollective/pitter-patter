import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("comment")
    .addColumn("id", "text", (col) => col.primaryKey().notNull())
    .addColumn("doc_id", "text", (col) =>
      col.notNull().references("doc.id").onDelete("cascade"),
    )
    .addColumn("user_id", "text", (col) => col.notNull())
    .addColumn("content", "text", (col) => col.notNull())
    .addColumn("ref", "text", (col) => col.notNull())
    .addColumn("version", "integer", (col) => col.notNull())
    .addUniqueConstraint("comment_ref_doc_unique", ["doc_id", "ref"])
    // IMPORTANT: We rely on this constraint to prevent simultaneous
    // writes from producing commits with the same version
    .addUniqueConstraint("comment_version_doc_unique", ["doc_id", "version"])
    .addColumn("created_at", "text", (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .addColumn("updated_at", "text", (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .execute();

  await sql`CREATE TRIGGER comment_trigger AFTER
UPDATE ON comment FOR EACH ROW BEGIN
UPDATE comment
SET
  updated_at = CURRENT_TIMESTAMP
WHERE
  id = OLD.id;
END;
`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("comment").execute();
}
