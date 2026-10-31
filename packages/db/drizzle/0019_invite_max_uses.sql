ALTER TABLE "workspace_invites" ADD COLUMN "max_uses" integer;--> statement-breakpoint
ALTER TABLE "workspace_invites" ADD COLUMN "use_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "workspace_invites" SET "max_uses" = 1, "use_count" = CASE WHEN "accepted_at" IS NULL THEN 0 ELSE 1 END;
