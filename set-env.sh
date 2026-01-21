#!/bin/bash

MODE=$1

# Default Dev URL (Localhost)
DEV_URL="postgresql://postgres:Manolikar@450@localhost:5432/saas_platform?schema=public"

# Production URL (Docker Host)
PROD_URL="postgresql://postgres:Manolikar@450@host.docker.internal:5432/saas_platform?schema=public"

if [ "$MODE" == "prod" ]; then
    echo "🔌 Switching to PRODUCTION environment..."
    # Check if we are on Mac (BSD sed) or Linux (GNU sed)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|DATABASE_URL=.*|DATABASE_URL=\"$PROD_URL\"|" .env
    else
        sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"$PROD_URL\"|" .env
    fi
    echo "✅ .env updated for Production (host.docker.internal)"

elif [ "$MODE" == "dev" ]; then
    echo "💻 Switching to DEVELOPMENT environment..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|DATABASE_URL=.*|DATABASE_URL=\"$DEV_URL\"|" .env
    else
        sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"$DEV_URL\"|" .env
    fi
    echo "✅ .env updated for Development (localhost)"

else
    echo "❌ Usage: ./set-env.sh [dev|prod]"
    exit 1
fi
