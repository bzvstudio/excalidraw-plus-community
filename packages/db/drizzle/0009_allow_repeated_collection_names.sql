ALTER TABLE "collection_teams" DROP CONSTRAINT "collection_teams_team_id_teams_id_fk";
--> statement-breakpoint
DROP INDEX "collections_workspace_id_name_key";--> statement-breakpoint
ALTER TABLE "collection_teams" ADD CONSTRAINT "collection_teams_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collections_workspace_id_idx" ON "collections" USING btree ("workspace_id");