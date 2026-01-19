#!/bin/bash

# Yukti SaaS Platform Deployment Script

echo "🚀 Starting Deployment Process..."

# 1. Check for Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: docker-compose is not installed."
    exit 1
fi

echo "✅ Docker environment verified."

# 2. Stop existing services
echo "🛑 Stopping existing services..."
docker-compose down

# 3. Build and Start Services
echo "🏗️  Building and Starting containers (this may take a while)..."
docker-compose up -d --build

# 4. Wait for Database to be ready
echo "⏳ Waiting for services to initialize..."
sleep 15

# 5. Run Database Migrations
echo "📦 Running Database Migrations..."
docker-compose exec -T api npx prisma migrate deploy

# 6. Seed Database (Optional - uncomment if needed for new setups)
# echo "🌱 Seeding Database..."
# docker-compose exec -T api npx prisma db seed

echo "=========================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=========================================="
echo "🌍 Client is running at: http://localhost:80 (or your server IP)"
echo "🔌 API is running at:    http://localhost:3000"
echo "=========================================="
