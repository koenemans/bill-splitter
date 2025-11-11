#!/bin/sh

# Ensure logs directory has correct permissions for non-root user
# This handles the case where Docker bind mount overrides directory ownership
if [ -d "/app/server/logs" ]; then
    # Change ownership of logs directory to nodejs user (UID 1001)
    chown -R 1001:1001 /app/server/logs
    chmod -R 755 /app/server/logs
fi

# Create logs directory if it doesn't exist
mkdir -p /app/server/logs
chown -R 1001:1001 /app/server/logs
chmod -R 755 /app/server/logs

# Start PM2 with the ecosystem config
exec pm2-runtime start ecosystem.config.cjs --env production
