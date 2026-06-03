<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    try {
        return view('welcome');
    } catch (\Throwable $e) {
        return response()->json([
            'message' => 'Web Route Exception: ' . $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString(),
        ], 500);
    }
});

Route::get('/login', function () {
    return response()->json(['message' => 'Unauthenticated.'], 401);
})->name('login');
