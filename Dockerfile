FROM node:22-alpine3.24 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Public Paddle browser configuration is embedded by Next.js at build time.
ARG NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
ARG NEXT_PUBLIC_PADDLE_ENV
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=${NEXT_PUBLIC_PADDLE_CLIENT_TOKEN}
ENV NEXT_PUBLIC_PADDLE_ENV=${NEXT_PUBLIC_PADDLE_ENV}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-alpine3.24 AS runtime-tools
# Update Alpine security packages; CVE-2026-85091 requires zlib >= 1.3.2-r1.
# npm is used in the builder only. The production image uses direct Node CLI
# for the app, backup jobs and mail workers; do not ship npm's vulnerable toolchain.
RUN apk upgrade --no-cache && apk add --no-cache postgresql-client rclone
RUN set -eux; \
 zlib_version="$(apk info -v zlib | sed -n 's/^zlib-//p')"; \
 echo "Installed Alpine zlib: $zlib_version"; \
 test -n "$zlib_version"; \
 apk version -t "$zlib_version" "1.3.2-r1"; \
 test "$(apk version -t "$zlib_version" "1.3.2-r1")" != "<"
RUN set -eux; \
 rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx; \
 ! command -v npm; \
 command -v node; command -v pg_dump; command -v rclone

FROM runtime-tools
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder --chown=app:app /app ./
USER app
EXPOSE 3000
 # Liveness: the marketing site stays routable during a temporary DB outage.
# DB readiness is monitored independently via /api/health.
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 CMD node -e "require('http').get('http://127.0.0.1:3000/',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
# Run Next.js directly as PID 1 so stop/restart signals reach Node.
CMD ["node","node_modules/next/dist/bin/next","start"]
