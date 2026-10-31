CREATE TABLE "workspace_removals" (
	"workspace_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"removed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "workspace_removals_workspace_id_user_id_pk" PRIMARY KEY("workspace_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "workspace_removals" ADD CONSTRAINT "workspace_removals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_removals" ADD CONSTRAINT "workspace_removals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;