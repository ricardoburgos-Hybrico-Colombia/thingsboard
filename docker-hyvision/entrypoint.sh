#!/bin/sh
set -e

if ! command -v python3 >/dev/null 2>&1; then
    echo "Installing python3 for HyVision White-Label API..."
    apk add --no-cache python3
fi

echo "Starting HyVision White-Labeling Micro-API..."
python3 /app/branding-api.py &

echo "Starting Nginx web server..."
exec /docker-entrypoint.sh nginx -g 'daemon off;'
