#!/bin/bash

# Ensure we have the correct keys and permissions
php artisan key:generate --force
php artisan config:cache
php artisan route:cache

# Run database migrations
php artisan migrate --force

# Remove physical storage folder if it exists, to allow symlink creation
rm -rf /var/www/public/storage

# Create storage symlink so uploaded images are publicly accessible
php artisan storage:link --force

# Start PHP-FPM in background
php-fpm -D

# Start Nginx in foreground
nginx -g "daemon off;"
