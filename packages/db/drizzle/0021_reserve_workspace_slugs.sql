DO $$
DECLARE
  reserved text[] := ARRAY['account', 'ai', 'api', 'assets', 'auth', 'embed', 'favicon.svg', 'files', 'fonts', 'forgot-password', 'g', 'healthz', 'home', 'index.html', 'invite', 'l', 'mcp', 'new', 'o', 'onboarding', 'reset-password', 's', 'settings', 'setup', 'share', 'shared', 'sign-in', 'sign-up', 'socket.io', 'thumbnails', 'trpc', 'w', 'workspace'];
  colliding record;
  candidate text;
  attempt integer;
BEGIN
  FOR colliding IN SELECT "id", "slug" FROM "workspaces" WHERE "slug" = ANY(reserved) ORDER BY "created_at", "id" LOOP
    candidate := colliding."slug" || '-workspace';
    attempt := 1;
    WHILE EXISTS (SELECT 1 FROM "workspaces" WHERE "slug" = candidate) LOOP
      attempt := attempt + 1;
      candidate := colliding."slug" || '-workspace-' || attempt;
    END LOOP;
    UPDATE "workspaces" SET "slug" = candidate WHERE "id" = colliding."id";
  END LOOP;
END $$;
