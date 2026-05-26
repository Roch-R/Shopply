<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\OrderController;

use App\Http\Controllers\CartItemController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\ChatController;

Route::get('/db-debug', function (\Illuminate\Http\Request $request) {
    try {
        $defaultConn = config('database.default');
        $connConfig = config("database.connections.{$defaultConn}");
        
        // Remove password / secret for safety
        if (isset($connConfig['password'])) {
            $connConfig['password'] = '******';
        }
        if (isset($connConfig['url'])) {
            $connConfig['url'] = preg_replace('/:([^@]+)@/', ':******@', $connConfig['url']);
        }

        $canConnect = false;
        $connectionError = null;
        try {
            \Illuminate\Support\Facades\DB::connection()->getPdo();
            $canConnect = true;
        } catch (\Exception $e) {
            $connectionError = $e->getMessage();
        }

        $tables = [];
        $migrationStatus = null;
        if ($canConnect) {
            try {
                $tables = array_map('current', \Illuminate\Support\Facades\DB::select('SHOW TABLES'));
                
                if ($request->query('migrate') === 'true') {
                    \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
                    $migrationStatus = \Illuminate\Support\Facades\Artisan::output();
                    $tables = array_map('current', \Illuminate\Support\Facades\DB::select('SHOW TABLES'));
                }
            } catch (\Exception $e) {
                // If SHOW TABLES fails, might be sqlite
                try {
                    $tables = array_map('current', \Illuminate\Support\Facades\DB::select("SELECT name FROM sqlite_master WHERE type='table'"));
                    if ($request->query('migrate') === 'true') {
                        \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
                        $migrationStatus = \Illuminate\Support\Facades\Artisan::output();
                        $tables = array_map('current', \Illuminate\Support\Facades\DB::select("SELECT name FROM sqlite_master WHERE type='table'"));
                    }
                } catch (\Exception $e2) {
                    $connectionError .= ' | Tables check failed: ' . $e->getMessage() . ' / ' . $e2->getMessage();
                }
            }
        }

        return response()->json([
            'default_connection' => $defaultConn,
            'connection_config' => $connConfig,
            'can_connect' => $canConnect,
            'connection_error' => $connectionError,
            'tables' => $tables,
            'migration_status' => $migrationStatus,
            'env_keys' => [
                'DB_CONNECTION' => env('DB_CONNECTION'),
                'MYSQL_URL' => env('MYSQL_URL') ? 'configured' : 'not_set',
                'DB_URL' => env('DB_URL') ? 'configured' : 'not_set',
                'GOOGLE_CLIENT_ID' => env('GOOGLE_CLIENT_ID') ? 'configured' : 'not_set',
                'GOOGLE_REDIRECT_URI' => env('GOOGLE_REDIRECT_URI'),
            ]
        ]);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()], 500);
    }
});

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);
Route::post('/auth/google/callback', [AuthController::class, 'handleGoogleCallback']);
Route::post('/verify-registration', [AuthController::class, 'verifyRegistration']);
Route::post('/resend-registration-otp', [AuthController::class, 'resendRegistrationOtp']);

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