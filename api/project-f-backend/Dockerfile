# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# ── Stage 2: production deps ─────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ── Stage 3: runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Production node_modules
COPY --from=deps /app/node_modules ./node_modules

# Prisma client (platform-specific binary generated in builder)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Compiled NestJS output
COPY --from=builder /app/dist ./dist

# Prisma schema + migrations (needed for migrate deploy)
COPY --from=builder /app/prisma ./prisma

COPY package*.json ./

EXPOSE 3000

CMD ["node", "dist/main"]
