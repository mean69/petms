<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CorrectionController;
use App\Http\Controllers\HealthRecordController;
use App\Http\Controllers\OwnerController;
use App\Http\Controllers\OwnershipController;
use App\Http\Controllers\PetController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::patch('/profile', [AuthController::class, 'profile']);
    Route::middleware('account.ready')->group(function () {
        Route::get('/references', [PetController::class, 'references']);
        Route::get('/dashboard', [PetController::class, 'dashboard']);
        Route::apiResource('owners', OwnerController::class)->only(['index', 'show', 'store', 'update']);
        Route::apiResource('pets', PetController::class)->only(['index', 'show', 'store', 'update']);
        Route::post('/pets/{pet}/archive', [PetController::class, 'archive']);
        Route::post('/pets/{pet}/restore', [PetController::class, 'restore']);
        Route::patch('/pets/{pet}/allergy-status', [PetController::class, 'allergyStatus'])->middleware('role:administrator,staff');
        Route::get('/pets/{pet}/{kind}', [HealthRecordController::class, 'index'])->where('kind', 'weights|medical-history|allergies|vaccinations');
        Route::get('/pets/{pet}/{kind}/{record}', [HealthRecordController::class, 'show'])->where('kind', 'weights|medical-history|allergies|vaccinations')->whereNumber('record');
        Route::middleware('role:administrator,staff')->group(function () {
            Route::post('/pets/{pet}/{kind}', [HealthRecordController::class, 'store'])->where('kind', 'weights|medical-history|allergies|vaccinations');
            Route::match(['put', 'patch'], '/pets/{pet}/{kind}/{record}', [HealthRecordController::class, 'update'])->where('kind', 'weights|medical-history|allergies|vaccinations')->whereNumber('record');
        });
        Route::middleware('role:administrator,client')->group(function () {
            Route::get('/corrections', [CorrectionController::class, 'index']);
            Route::post('/corrections', [CorrectionController::class, 'store'])->middleware('role:client');
        });
        Route::middleware('role:administrator')->group(function () {
            Route::post('/owners/{owner}/link', [OwnerController::class, 'link']);
            Route::get('/pets/{pet}/ownerships', [OwnershipController::class, 'index']);
            Route::post('/pets/{pet}/transfer', [OwnershipController::class, 'transfer']);
            Route::get('/users', [AdminController::class, 'index']);
            Route::patch('/users/{user}', [AdminController::class, 'update']);
            Route::post('/users/{user}/decision', [AdminController::class, 'decision']);
            Route::post('/corrections/{correction}/resolve', [CorrectionController::class, 'resolve']);
            Route::get('/activity-logs',[AdminController::class, 'logs']);
        });
    });
});
