<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    private const MAX_FAILED_ATTEMPTS = 5;   // wrong passwords allowed...
    private const LOCKOUT_SECONDS = 60;      // ...per minute, per username + IP address

    /** POST /api/login — username + password, returns a Sanctum token. */
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        // Only failed attempts count, so normal users are never slowed down.
        $key = 'login:'.Str::lower($data['username']).'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($key, self::MAX_FAILED_ATTEMPTS)) {
            $seconds = RateLimiter::availableIn($key);
            Audit::log('login_blocked', "Login blocked for '{$data['username']}' (too many failed attempts)", null, null, $data['username']);

            return response()->json(['message' => "Too many failed attempts. Try again in {$seconds} seconds."], 429);
        }

        $user = User::where('username', $data['username'])->first();

        if (! $user || ! $user->password || ! Hash::check($data['password'], $user->password)) {
            RateLimiter::hit($key, self::LOCKOUT_SECONDS);
            Audit::log('login_failed', "Failed login for '{$data['username']}'", null, null, $data['username']);

            return response()->json(['message' => 'Invalid username or password.'], 422);
        }

        RateLimiter::clear($key);
        Audit::log('login', 'Signed in', null, $user);

        return response()->json([
            'token' => $user->createToken('spa')->plainTextToken,
            'user' => $user,
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user());
    }

    public function logout(Request $request): JsonResponse
    {
        Audit::log('logout', 'Signed out');
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }
}
