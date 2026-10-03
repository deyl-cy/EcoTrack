<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BinController;
use App\Http\Controllers\Api\CollectionRecordController;
use App\Http\Controllers\Api\CollectionRouteController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ScheduleController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VehicleController;
use Illuminate\Support\Facades\Route;

// ---------- Public ----------
Route::post('/login', [AuthController::class, 'login']);

// ---------- Any logged-in user ----------
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Lists are needed by every role (dropdowns, collector's own assignments).
    Route::get('/schedules', [ScheduleController::class, 'index']);
    Route::get('/schedules/{schedule}', [ScheduleController::class, 'show']);
    Route::get('/routes', [CollectionRouteController::class, 'index']);
    Route::get('/routes/{route}/stops', [CollectionRouteController::class, 'stops']);

    // ---------- Collector ----------
    Route::post('/records', [CollectionRecordController::class, 'store'])->middleware('role:Collector');

    // ---------- Admin + Supervisor ----------
    Route::middleware('role:Admin,Supervisor')->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'summary']);
        Route::get('/monitor', [DashboardController::class, 'monitor']);
        Route::get('/bins', [BinController::class, 'index']);
        Route::get('/vehicles', [VehicleController::class, 'index']);
        Route::get('/users', [UserController::class, 'index']);   // collector dropdowns
        Route::post('/schedules', [ScheduleController::class, 'store']);
        Route::put('/schedules/{schedule}', [ScheduleController::class, 'update']);
        Route::delete('/schedules/{schedule}', [ScheduleController::class, 'destroy']);
        Route::post('/routes', [CollectionRouteController::class, 'store']);
        Route::put('/routes/{route}', [CollectionRouteController::class, 'update']);
        Route::delete('/routes/{route}', [CollectionRouteController::class, 'destroy']);
    });

    // ---------- Admin only ----------
    Route::middleware('role:Admin')->group(function () {
        Route::post('/bins', [BinController::class, 'store']);
        Route::put('/bins/{bin}', [BinController::class, 'update']);
        Route::delete('/bins/{bin}', [BinController::class, 'destroy']);
        Route::post('/vehicles', [VehicleController::class, 'store']);
        Route::put('/vehicles/{vehicle}', [VehicleController::class, 'update']);
        Route::delete('/vehicles/{vehicle}', [VehicleController::class, 'destroy']);
        Route::post('/users', [UserController::class, 'store']);
        Route::put('/users/{user}', [UserController::class, 'update']);
        Route::delete('/users/{user}', [UserController::class, 'destroy']);
        Route::get('/reports', [DashboardController::class, 'report']);
        Route::get('/reports/export', [DashboardController::class, 'exportCsv']);
    });
});
