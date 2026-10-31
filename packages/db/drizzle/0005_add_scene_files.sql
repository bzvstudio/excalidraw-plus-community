CREATE TABLE "scene_files" (
	"scene_id" uuid NOT NULL,
	"file_id" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"content_key_id" text NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scene_files_scene_id_file_id_pk" PRIMARY KEY("scene_id","file_id")
);
--> statement-breakpoint
ALTER TABLE "scene_files" ADD CONSTRAINT "scene_files_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_files" ADD CONSTRAINT "scene_files_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;