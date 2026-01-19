# Stage 1: Build
FROM node:20-alpine AS builder

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Install dependencies (utilizing cache)
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Copy schema and generate Prisma Client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source code
COPY . .

# Build the API
RUN npx nx build api --configuration=production

# Stage 2: Production
FROM node:20-alpine

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy built assets
COPY --from=builder /app/dist/apps/api ./dist/apps/api
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/tsconfig.seed.json ./tsconfig.seed.json

# Expose port
EXPOSE 3000

# Start command
CMD ["node", "dist/apps/api/main.js"]
