# syntax=docker/dockerfile:1

FROM node:24.22.1-alpine3.24@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53 AS build
RUN npm install --global pnpm@12.6.0
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch
COPY . .
RUN pnpm install --offline --frozen-lockfile --filter @repo/web... --filter @repo/api... \
    && pnpm --filter @repo/web --filter @repo/api build

FROM node:24.22.1-alpine3.24@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53
RUN rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
    /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-*
ENV NODE_ENV=production \
    WEB_DIST_DIR=/app/web
WORKDIR /app
COPY --from=build /app/apps/api/dist ./
COPY --from=build /app/apps/web/dist web
COPY LICENSE THIRD_PARTY_NOTICES.md web/
USER node
EXPOSE 3100
HEALTHCHECK --interval=10s --timeout=3s --start-period=60s --retries=3 \
    CMD wget -q -O /dev/null "http://127.0.0.1:${PORT:-3100}/healthz" || exit 1
CMD ["node", "--enable-source-maps", "index.mjs"]
