CREATE TABLE "workspace_avatars" (
	"workspace_id" uuid PRIMARY KEY NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"image" "bytea" NOT NULL,
	"content_key_id" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "workspace_avatars_id_unique" UNIQUE("id")
);
--> statement-breakpoint
ALTER TABLE "workspace_avatars" ADD CONSTRAINT "workspace_avatars_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;