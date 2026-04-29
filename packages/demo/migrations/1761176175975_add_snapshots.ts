import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("snapshot")
    .addColumn("id", "text", (col) => col.primaryKey().notNull())
    .addColumn("doc_id", "text", (col) => col.notNull().references("doc.id").onDelete("cascade"))
    .addColumn("content", "text", (col) => col.notNull())
    .addColumn("version", "integer", (col) => col.notNull())
    .addColumn("created_at", "text", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn("updated_at", "text", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addUniqueConstraint("version_doc_unique", ["doc_id", "version"])
    .execute();

  await sql`CREATE TRIGGER snapshot_trigger AFTER
UPDATE ON snapshot FOR EACH ROW BEGIN
UPDATE snapshot
SET
  updated_at = CURRENT_TIMESTAMP
WHERE
  id = OLD.id;
END;
`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("snapshot").execute();
}
