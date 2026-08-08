# syntax=docker/dockerfile:1
# Build context: repository root
# docker build -f workers/scan/Dockerfile .

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS builder
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY workers/scan/package.json ./workers/scan/
COPY packages/types/package.json ./packages/types/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/
RUN pnpm install --frozen-lockfile || pnpm install
COPY packages ./packages
COPY workers/scan ./workers/scan
RUN pnpm --filter @qa-automater/types build && pnpm --filter @qa-automater/shared build
RUN pnpm --filter @qa-automater/scan-worker build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 worker
COPY --from=builder /app/workers/scan/dist ./dist
COPY --from=builder /app/workers/scan/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./node_modules/@qa-automater/shared/dist
COPY --from=builder /app/packages/types/dist ./node_modules/@qa-automater/types/dist
USER worker
EXPOSE 8081
ENV PORT=8081
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8081/health || exit 1
CMD ["node", "dist/index.js"]
