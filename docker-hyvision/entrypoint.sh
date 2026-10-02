#!/bin/sh
set -e

if ! command -v python3 >/dev/null 2>&1 || ! python3 -c "import openpyxl" >/dev/null 2>&1; then
    echo "Installing python3 and py3-openpyxl for HyVision APIs..."
    apk add --no-cache python3 py3-openpyxl
fi

echo "Starting HyVision White-Labeling & Reporting API..."
python3 /app/branding-api.py &

echo "Starting Nginx web server..."
exec /docker-entrypoint.sh nginx -g 'daemon off;'

