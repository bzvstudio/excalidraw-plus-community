.DEFAULT_GOAL := help
.PHONY: help install up down migrate dev build typecheck lint

DB_CONTAINER := excalidraw-plus-community-db
DB_VOLUME := excalidraw-plus-community-db-data
DB_IMAGE := postgres:17-alpine
# Matches DATABASE_URL in .env.example.
DB_PORT := 5498
DB_NAME := excalidraw_plus

help: ## Show this list
	@awk 'BEGIN {FS = ":.*## "} /^[a-z-]+:.*## / {printf "  %-10s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install packages from the lockfile
	pnpm install --frozen-lockfile

up: ## Start Postgres and wait until it accepts connections
	@docker info >/dev/null 2>&1 || { echo "Docker is not running. Start it and try again." >&2; exit 1; }
	@docker start $(DB_CONTAINER) >/dev/null 2>&1 || docker run -d --name $(DB_CONTAINER) \
		-e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=$(DB_NAME) \
		-p $(DB_PORT):5432 -v $(DB_VOLUME):/var/lib/postgresql/data $(DB_IMAGE) >/dev/null
	@for i in $$(seq 1 30); do \
		docker exec $(DB_CONTAINER) pg_isready -q -h 127.0.0.1 -U postgres -d $(DB_NAME) && exit 0; \
		sleep 1; \
	done; echo "Postgres did not become ready. Check: docker logs $(DB_CONTAINER)" >&2; exit 1

down: ## Stop Postgres and keep its data
	@docker stop $(DB_CONTAINER) >/dev/null

migrate: up .env node_modules ## Apply database migrations
	@DATABASE_URL="$$(sed -n 's/^DATABASE_URL=//p' .env)" pnpm --filter @repo/db db:migrate

# The API only migrates itself outside development, so dev has to do it here.
dev: migrate ## Run the web app and API in watch mode
	pnpm dev

build: node_modules ## Build every package
	pnpm build

typecheck: node_modules ## Typecheck every package
	pnpm typecheck

lint: node_modules ## Lint every package
	pnpm lint

node_modules:
	pnpm install --frozen-lockfile

# No prerequisites on purpose: remaking .env would replace ENCRYPTION_KEY, and
# losing that key loses every scene encrypted with it.
.env:
	@umask 077 && sed \
		-e "s|^AUTH_SECRET=.*|AUTH_SECRET=$$(openssl rand -base64 32)|" \
		-e "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$$(openssl rand -base64 32)|" \
		.env.example > .env
	@echo "Created .env with generated secrets"
