INSERT INTO "collections" ("workspace_id", "name")
SELECT DISTINCT "workspace_id", 'General' FROM "scenes" WHERE "collection_id" IS NULL
ON CONFLICT ("workspace_id", "name") DO NOTHING;
--> statement-breakpoint
UPDATE "scenes" SET "collection_id" = "collections"."id"
FROM "collections"
WHERE "scenes"."collection_id" IS NULL
  AND "collections"."workspace_id" = "scenes"."workspace_id"
  AND "collections"."name" = 'General';
