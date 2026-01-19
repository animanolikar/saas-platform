#!/bin/bash

# Yukti SaaS Platform Deployment Script

echo "🚀 Starting Deployment Process..."

# Check for docker-compose (v1) or docker compose (v2+ plugin)
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
elif docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
else
    echo "❌ Error: Neither 'docker-compose' nor 'docker compose' is installed."
    echo "Please install Docker Compose plugin: sudo apt-get install docker-compose-plugin"
    exit 1
fi

echo "✅ Using: $DOCKER_COMPOSE"
echo "✅ Docker environment verified."

# 1. Stop existing services
echo "🛑 Stopping existing services..."
$DOCKER_COMPOSE down

# 2. Build and Start Services
echo "🏗️  Building and Starting containers (this may take a while)..."
$DOCKER_COMPOSE up -d --build

# 3. Wait for Database to be ready
echo "⏳ Waiting for services to initialize..."
sleep 15

# 4. Run Database Migrations
echo "📦 Running Database Migrations..."
$DOCKER_COMPOSE exec -T api npx prisma migrate deploy

# 5. Seed Database (Optional)
# echo "🌱 Seeding Database..."
# $DOCKER_COMPOSE exec -T api npx prisma db seed

echo "=========================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=========================================="
echo "🌍 Client is running at: http://localhost:80 (or your server IP)"
echo "🔌 API is running at:    http://localhost:3000"
echo "=========================================="
