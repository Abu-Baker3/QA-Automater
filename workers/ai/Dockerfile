# syntax=docker/dockerfile:1
# docker build -f workers/ai/Dockerfile .

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS builder
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY workers/ai/package.json ./workers/ai/
COPY packages/types/package.json ./packages/types/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/
RUN pnpm install --frozen-lockfile || pnpm install
COPY packages ./packages
COPY workers/ai ./workers/ai
RUN pnpm --filter @qa-automater/types build && pnpm --filter @qa-automater/shared build
RUN pnpm --filter @qa-automater/ai-worker build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 worker
COPY --from=builder /app/workers/ai/dist ./dist
COPY --from=builder /app/workers/ai/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
USER worker
EXPOSE 8082
ENV PORT=8082
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8082/health || exit 1
CMD ["node", "dist/index.js"]
