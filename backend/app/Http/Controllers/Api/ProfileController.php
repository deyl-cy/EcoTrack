<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

/** Every logged-in user manages their own details here (username and role stay admin-controlled). */
class ProfileController extends Controller
{
    /** PUT /api/profile */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'full_name' => ['required', 'string', 'max:100'],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('users')->ignore($user)],
            'contact_number' => ['nullable', 'string', 'max:20'],
        ]);

        $before = Audit::snapshot($user);
        $user->update($data);
        Audit::log('updated', 'Updated own profile ('.Audit::diff($before, $user).')', $user);

        return response()->json($user);
    }

    /** PUT /api/profile/password — must know the current password; other devices are signed out. */
    public function password(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'confirmed', 'different:current_password', Password::min(8)->letters()->numbers()],
        ]);

        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages(['current_password' => 'Your current password is incorrect.']);
        }

        $user->update(['password' => $data['password']]);

        // Sign out every other device/browser that still holds a token for this account.
        $current = $user->currentAccessToken();
        $keep = $current instanceof PersonalAccessToken ? $current->id : null;
        $user->tokens()->when($keep, fn ($q) => $q->where('id', '!=', $keep))->delete();

        Audit::log('password', 'Changed own password', $user);

        return response()->json(['message' => 'Password changed. Other devices were signed out.']);
    }
}
