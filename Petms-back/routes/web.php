<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\GoogleAuthController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => response()->json(['application' => 'PetFave', 'api' => '/api/v1']));
Route::middleware('throttle:10,1')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login'])->name('login');
    Route::post('/auth/google/start', [GoogleAuthController::class, 'start']);
    Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback'])->name('google.callback');
});
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth');
