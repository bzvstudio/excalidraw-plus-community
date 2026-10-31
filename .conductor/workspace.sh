#!/usr/bin/env bash
# Conductor's setup, run and archive scripts. Each workspace gets its own ports
# and its own database on one shared Postgres container, so branches can run
# side by side and migrate without touching each other.
set -euo pipefail

CONTAINER=excalidraw-plus-community-db
VOLUME=excalidraw-plus-community-db-data
IMAGE=postgres:17-alpine
PG_PORT=5498
MAIN_DB=excalidraw_plus

# From the workspace path, not its display name: renaming a workspace must not
# orphan its database. Postgres truncates identifiers at 63 characters.
slug="$(basename "${CONDUCTOR_WORKSPACE_PATH:-$PWD}" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9\n' '_')"
DB="$(printf '%s_%s' "$MAIN_DB" "$slug" | cut -c1-63)"

start_postgres() {
  docker info >/dev/null 2>&1 || { echo "Docker is not running. Start it and try again." >&2; return 1; }
  docker start "$CONTAINER" >/dev/null 2>&1 || docker run -d --name "$CONTAINER" \
    -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB="$MAIN_DB" \
    -p "$PG_PORT:5432" -v "$VOLUME:/var/lib/postgresql/data" "$IMAGE" >/dev/null
  for _ in $(seq 1 30); do
    docker exec "$CONTAINER" pg_isready -q -h 127.0.0.1 -U postgres && return 0
    sleep 1
  done
  echo "Postgres did not become ready. Check: docker logs $CONTAINER" >&2
  return 1
}

psql_admin() {
  docker exec "$CONTAINER" psql -v ON_ERROR_STOP=1 -q -U postgres -d postgres -tAc "$1"
}

setup() {
  pnpm install --frozen-lockfile

  # Conductor copies .env from the repository root; a root without one gets
  # fresh secrets here, which is fine because the database is this workspace's.
  if [ ! -f .env ]; then
    (
      umask 077
      sed -e "s|^AUTH_SECRET=.*|AUTH_SECRET=$(openssl rand -base64 32)|" \
        -e "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$(openssl rand -base64 32)|" \
        .env.example >.env
    )
    echo "Created .env with generated secrets"
  fi
}

run() {
  : "${CONDUCTOR_PORT:?CONDUCTOR_PORT is not set; run this from Conductor}"

  start_postgres
  if [ -z "$(psql_admin "SELECT 1 FROM pg_database WHERE datname = '$DB'")" ]; then
    psql_admin "CREATE DATABASE \"$DB\""
    echo "Created database $DB"
  fi

  # These beat the values in .env, which the API loads without overriding.
  export WEB_PORT="$CONDUCTOR_PORT"
  export PORT="$((CONDUCTOR_PORT + 1))"
  export PUBLIC_BASE_URL="http://localhost:$WEB_PORT"
  export DATABASE_URL="postgres://postgres:postgres@localhost:$PG_PORT/$DB"

  # The API only migrates itself outside development.
  pnpm --filter @repo/db db:migrate

  echo "Web: $PUBLIC_BASE_URL  API: http://localhost:$PORT  Database: $DB"
  exec pnpm dev
}

# Best effort: a stopped Docker must never block archiving a workspace.
archive() {
  if start_postgres && psql_admin "DROP DATABASE IF EXISTS \"$DB\" WITH (FORCE)"; then
    echo "Dropped database $DB"
  else
    echo "Could not drop database $DB; remove it by hand if it exists." >&2
  fi
}

case "${1:-}" in
  setup) setup ;;
  run) run ;;
  archive) archive ;;
  *)
    echo "Usage: $0 setup|run|archive" >&2
    exit 2
    ;;
esac
