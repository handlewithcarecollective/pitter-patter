import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("doc")
    .addColumn("created_at", "text", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await db.schema
    .alterTable("doc")
    .addColumn("updated_at", "text", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await sql`CREATE TRIGGER doc_trigger AFTER
UPDATE ON doc FOR EACH ROW BEGIN
UPDATE doc
SET
  updated_at = CURRENT_TIMESTAMP
WHERE
  id = OLD.id;
END;
`.execute(db);

  await db.schema
    .alterTable("commit")
    .addColumn("created_at", "text", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await db.schema
    .alterTable("commit")
    .addColumn("updated_at", "text", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await sql`CREATE TRIGGER commit_trigger AFTER
UPDATE ON "commit" FOR EACH ROW BEGIN
UPDATE "commit"
SET
  updated_at = CURRENT_TIMESTAMP
WHERE
  id = OLD.id;
END;
`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("doc").dropColumn("created_at").execute();
  await db.schema.alterTable("doc").dropColumn("updated_at").execute();
  await db.schema.alterTable("commit").dropColumn("created_at").execute();
  await db.schema.alterTable("commit").dropColumn("updated_at").execute();
}
