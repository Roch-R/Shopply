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

// Public Shop Route
Route::get('/shop/items', [ItemController::class, 'index']);
Route::get('/items/{id}/reviews', [ReviewController::class, 'index']);
Route::get('/phpinfo', function() {
    return response()->json([
        'upload_max_filesize' => ini_get('upload_max_filesize'),
        'post_max_size' => ini_get('post_max_size')
    ]);
});

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