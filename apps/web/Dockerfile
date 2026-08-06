# Multi-stage Dockerfile for Next.js Web App

FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package configs
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy web source code
COPY apps/web ./apps/web

WORKDIR /app/apps/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN mkdir -p public
RUN npm run build

# Production image stage
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY package*.json ./
COPY apps/web/package*.json ./apps/web/

# Install production dependencies only
RUN npm install --omit=dev --legacy-peer-deps

COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/next.config.mjs ./apps/web/

EXPOSE 3000

CMD ["npm", "run", "start", "--prefix", "apps/web"]
