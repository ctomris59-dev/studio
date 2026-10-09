FROM node:22-alpine AS builder
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

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
# Supply the binaries required by the documented backup/off-site jobs.
RUN apk add --no-cache postgresql-client rclone
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder --chown=app:app /app ./
USER app
EXPOSE 3000
 # Liveness: the marketing site stays routable during a temporary DB outage.
# DB readiness is monitored independently via /api/health.
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 CMD node -e "require('http').get('http://127.0.0.1:3000/',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["npm","run","start"]
