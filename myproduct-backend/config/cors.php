<?php

$allowedOrigins = env('CORS_ALLOWED_ORIGINS', '*');
$origins = $allowedOrigins === '*' ? ['*'] : array_map('trim', explode(',', $allowedOrigins));

return [
    'paths' => ['api/*', 'storage/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => $origins,
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];