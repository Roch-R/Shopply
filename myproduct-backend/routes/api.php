<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\OrderController;

use App\Http\Controllers\CartItemController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\ChatController;
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);
Route::post('/auth/google/callback', [AuthController::class, 'handleGoogleCallback']);
Route::post('/verify-registration', [AuthController::class, 'verifyRegistration']);
Route::post('/resend-registration-otp', [AuthController::class, 'resendRegistrationOtp']);
Route::post('/telegram/webhook', [AuthController::class, 'telegramWebhook']);
Route::post('/telegram/link-phone', [AuthController::class, 'telegramLinkPhone']);
Route::post('/telegram/register-webhook', [AuthController::class, 'telegramRegisterWebhook']);

// Public Shop Route
Route::get('/shop/items', [ItemController::class, 'index']);
Route::get('/items/{id}/reviews', [ReviewController::class, 'index']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout',       [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/profile', [AuthController::class, 'updateProfile']);
    Route::get('/users',         [AuthController::class, 'users']);
    Route::post('/verify-email', [AuthController::class, 'verifyEmail']);
    Route::post('/resend-otp',   [AuthController::class, 'resendOtp']);
    Route::delete('/users/{id}', [AuthController::class, 'deleteUser']);
    Route::post('/users/{id}/follow', [AuthController::class, 'toggleFollow']);
    Route::delete('/account', [AuthController::class, 'deleteAccount']);

    // Item Routes
    Route::get('/items', [ItemController::class, 'userItems']);
    Route::post('/items', [ItemController::class, 'store']);
    Route::match(['post', 'put'], '/items/{id}', [ItemController::class, 'update']); // Use POST with _method=PUT for multipart/form-data
    Route::put('/items/{id}/publish', [ItemController::class, 'togglePublish']);
    Route::delete('/items/{id}', [ItemController::class, 'destroy']);

    // Review Routes
    Route::post('/reviews', [ReviewController::class, 'store']);

    // Cart Routes
    Route::get('/cart', [CartItemController::class, 'index']);
    Route::post('/cart', [CartItemController::class, 'store']);
    Route::put('/cart/{id}', [CartItemController::class, 'update']);
    Route::delete('/cart/{id}', [CartItemController::class, 'destroy']);
    Route::post('/cart/checkout', [OrderController::class, 'checkoutCart']);

    // Order Routes
    Route::post('/orders', [OrderController::class, 'store']);
    Route::get('/orders', [OrderController::class, 'myOrders']);
    Route::put('/orders/{id}/receive', [OrderController::class, 'receiveOrder']);
    
    // Seller Order Routes
    Route::get('/seller/orders', [OrderController::class, 'sellerOrders']);
    Route::put('/seller/orders/{id}/accept', [OrderController::class, 'acceptOrder']);
    Route::put('/seller/orders/{id}/reject', [OrderController::class, 'rejectOrder']);
    Route::put('/seller/orders/{id}/ship', [OrderController::class, 'shipOrder']);

    // Chat Routes
    Route::get('/chat/conversations', [ChatController::class, 'getConversations']);
    Route::get('/chat/{userId}', [ChatController::class, 'getMessages']);
    Route::post('/chat/{userId}/typing', [ChatController::class, 'typing']);
    Route::post('/chat/{userId}', [ChatController::class, 'sendMessage']);
});

Route::get('/debug-logs', function() {
    $nginxError = @file_get_contents('/var/log/nginx/error.log') ?: 'Nginx error log is empty or unreadable';
    $nginxAccess = @file_get_contents('/var/log/nginx/access.log') ?: 'Nginx access log is empty or unreadable';
    
    // Log a test message to trigger log file creation
    try {
        \Illuminate\Support\Facades\Log::info("Debug logs route was accessed.");
        $logStatus = "Logged successfully";
    } catch (\Throwable $e) {
        $logStatus = "Log error: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine();
    }

    $laravelLogPath = storage_path('logs/laravel.log');
    $laravelLog = @file_get_contents($laravelLogPath) ?: 'Laravel log is empty or unreadable';
    
    $tail = function($content, $lines = 100) {
        $arr = explode("\n", $content);
        $arr = array_slice($arr, -$lines);
        return implode("\n", $arr);
    };

    $logFiles = [];
    if (file_exists(storage_path('logs'))) {
        foreach (scandir(storage_path('logs')) as $file) {
            if ($file !== '.' && $file !== '..') {
                $path = storage_path("logs/$file");
                $logFiles[$file] = [
                    'size' => filesize($path),
                    'writable' => is_writable($path),
                    'owner' => function_exists('posix_getpwuid') ? posix_getpwuid(fileowner($path))['name'] : fileowner($path),
                    'perms' => substr(sprintf('%o', fileperms($path)), -4),
                ];
            }
        }
    }

    return response()->json([
        'nginx_error' => $tail($nginxError),
        'nginx_access' => $tail($nginxAccess),
        'laravel_log' => $tail($laravelLog),
        'log_status' => $logStatus,
        'log_files' => $logFiles,
        'logs_dir_writable' => is_writable(storage_path('logs')),
        'php_ini' => [
            'upload_max_filesize' => ini_get('upload_max_filesize'),
            'post_max_size' => ini_get('post_max_size'),
            'memory_limit' => ini_get('memory_limit'),
            'max_execution_time' => ini_get('max_execution_time'),
            'max_input_time' => ini_get('max_input_time'),
        ],
        'storage_debug' => [
            'public_path_storage_exists' => file_exists(public_path('storage')),
            'public_path_storage_is_link' => is_link(public_path('storage')),
            'public_path_storage_link_target' => is_link(public_path('storage')) ? readlink(public_path('storage')) : null,
            'storage_app_public_exists' => file_exists(storage_path('app/public')),
            'item_images_dir_exists' => file_exists(storage_path('app/public/item-images')),
            'item_images_files' => file_exists(storage_path('app/public/item-images')) ? scandir(storage_path('app/public/item-images')) : [],
            'item_videos_files' => file_exists(storage_path('app/public/item-videos')) ? scandir(storage_path('app/public/item-videos')) : [],
        ]
    ]);
});

Route::get('/media/{filename}', function ($filename, \Illuminate\Http\Request $request) {
    $media = \DB::table('media')->where('filename', $filename)->first();
    if (!$media) {
        abort(404);
    }
    
    $data = $media->data;
    if (is_resource($data)) {
        $data = stream_get_contents($data);
    }

    $size = strlen($data);
    $mimeType = $media->mime_type;

    $headers = [
        'Content-Type' => $mimeType,
        'Cache-Control' => 'public, max-age=31536000',
        'Access-Control-Allow-Origin' => '*',
        'Accept-Ranges' => 'bytes',
    ];

    if ($request->headers->has('Range')) {
        $range = $request->header('Range');
        if (preg_match('/bytes=\s*(\d+)-(\d*)/', $range, $matches)) {
            $start = intval($matches[1]);
            $end = $matches[2] !== '' ? intval($matches[2]) : $size - 1;

            if ($start >= $size || $end >= $size || $start > $end) {
                return response('', 416, [
                    'Content-Range' => "bytes */$size",
                    'Access-Control-Allow-Origin' => '*',
                ]);
            }

            $length = $end - $start + 1;
            $chunk = substr($data, $start, $length);

            return response($chunk, 206, array_merge($headers, [
                'Content-Range' => "bytes $start-$end/$size",
                'Content-Length' => $length,
            ]));
        }
    }

    return response($data, 200, array_merge($headers, [
        'Content-Length' => $size,
    ]));
});