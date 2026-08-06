# Multi-stage Dockerfile for NestJS API

FROM node:20-alpine AS builder
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

# Copy root and package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma/

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy API source code
COPY apps/api ./apps/api

# Set dummy DATABASE_URL for Prisma Client generation during build
ENV DATABASE_URL="postgresql://sf_user:sf_password_secure_2026@sf-db:5432/saudefinancas?schema=public"

# Generate Prisma client and build NestJS
WORKDIR /app/apps/api
RUN npx prisma generate --schema=prisma/schema.prisma
RUN npm run build

# Production image stage
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma/

# Install production dependencies only
RUN npm install --omit=dev --legacy-peer-deps

# Copy built distribution code and Prisma client
COPY --from=builder /app/apps/api/dist ./apps/api/dist
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

EXPOSE 3001

CMD ["sh", "-c", "cd apps/api && (node dist/src/main.js || node dist/main.js)"]
