# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (utilizing cache)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the API
RUN npx nx build api

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Copy built assets
COPY --from=builder /app/dist/apps/api ./dist/apps/api
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Expose port
EXPOSE 3000

# Start command
CMD ["node", "dist/apps/api/main.js"]
