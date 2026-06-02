# ── Stage 1: build ────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/tsconfig.json ./
COPY backend/prisma ./prisma
RUN npx prisma generate
COPY backend/src ./src
RUN npm run build

# ── Stage 2: runtime ──────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY backend/prisma ./prisma
# SQLite database lives on a mounted volume at /data/db.sqlite
EXPOSE 3001
CMD ["node", "dist/server.js"]
