# Multi-stage Dockerfile for Railway / generic Node.js hosting
# Use when deploying outside Cloudflare Workers

FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/instrument.server.mjs ./
COPY --from=builder /app/package.json ./
EXPOSE 3000
ENV PORT=3000
CMD ["node", "--import", "./.output/server/instrument.server.mjs", ".output/server/index.mjs"]
