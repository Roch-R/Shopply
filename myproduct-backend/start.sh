#!/bin/bash

# Ensure we have the correct keys and permissions
php artisan key:generate --force
php artisan config:cache
php artisan route:cache

# Run database migrations
php artisan migrate --force

# Create storage symlink so uploaded images are publicly accessible
php artisan storage:link --force 2>/dev/null || true

# Railway sets $PORT environment variable. Replace listen 80 with the correct port.
PORT=${PORT:-80}
sed -i "s/listen 80;/listen $PORT;/" /etc/nginx/sites-enabled/default

# Start PHP-FPM in background
php-fpm -D

# Start Nginx in foreground
nginx -g "daemon off;"
