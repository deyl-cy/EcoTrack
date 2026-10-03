<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Usage in routes:  ->middleware('role:Admin,Supervisor')
 * Replaces requireRole() from includes/auth.php in the PHP version.
 */
class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        if (! $request->user() || ! $request->user()->hasRole(...$roles)) {
            return response()->json(['message' => 'You are not authorized to do that.'], 403);
        }

        return $next($request);
    }
}
