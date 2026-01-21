#!/bin/bash

SERVICE=${1:-api} # Default to 'api' if no argument provided

echo "🔍 Fetching logs for saas_$SERVICE..."
echo "Use Ctrl+C to stop following logs."
echo "----------------------------------------"

if command -v docker-compose &> /dev/null; then
    docker-compose logs -f $SERVICE
elif docker compose version >/dev/null 2>&1; then
    docker compose logs -f $SERVICE
else
    # Fallback to direct docker command if compose is not found/working
    docker logs -f saas_$SERVICE
fi
