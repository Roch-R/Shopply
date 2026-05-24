#!/bin/bash

# Ensure we have the correct keys and permissions
php artisan key:generate --force
php artisan config:cache
php artisan route:cache

# Run database migrations
php artisan migrate --force

# Start PHP-FPM in background
php-fpm -D

# Start Nginx in foreground
nginx -g "daemon off;"
