# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY workers/scan/package.json ./workers/scan/
COPY workers/ai/package.json ./workers/ai/
COPY workers/export/package.json ./workers/export/
COPY packages ./packages
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app ./
COPY . .
RUN pnpm --filter @qa-automater/types build && pnpm --filter @qa-automater/shared build
RUN pnpm --filter @qa-automater/scan-worker build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 worker
COPY --from=builder /app/workers/scan/dist ./dist
COPY --from=builder /app/workers/scan/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
USER worker
EXPOSE 8081
ENV PORT=8081
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8081/health || exit 1
CMD ["node", "dist/index.js"]
