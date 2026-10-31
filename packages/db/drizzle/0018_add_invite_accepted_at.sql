ALTER TABLE "workspace_invites" ADD COLUMN "accepted_at" timestamp with time zone;--> statement-breakpoint
UPDATE "workspace_invites" SET "accepted_at" = "joined"."at"
FROM (
	SELECT "target_id", min("at") AS "at" FROM "audit_events"
	WHERE "action" = 'member.joined' AND "target_kind" = 'invite'
	GROUP BY "target_id"
) AS "joined"
WHERE "joined"."target_id" = "workspace_invites"."id"::text AND "workspace_invites"."revoked_at" IS NULL;
