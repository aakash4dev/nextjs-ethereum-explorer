# syntax=docker/dockerfile:1.7
# Multi-stage build producing a small runtime image that can run either the
# web server (default) or the indexer worker (`node scripts/sync.js`).

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm prune --omit=dev --no-audit --no-fund

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    SOLC_CACHE_DIR=/app/.solc-cache
RUN groupadd --system --gid 1001 app && useradd --system --uid 1001 --gid app app \
 && mkdir -p /app/.solc-cache && chown app:app /app/.solc-cache
# Next.js standalone server
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
# Worker, scripts, compiler worker thread and their production dependencies
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/scripts ./scripts
COPY --from=build --chown=app:app /app/src/lib ./src/lib
COPY --from=build --chown=app:app /app/workers ./workers
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health?live=1').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
