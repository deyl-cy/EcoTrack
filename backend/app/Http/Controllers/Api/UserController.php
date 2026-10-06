<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/** Admin-only account management (Personnel page). */
class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $users = User::query()
            ->when($request->query('role'), fn ($q, $r) => $q->where('role', $r))
            ->orderBy('full_name')
            ->get();

        return response()->json($users);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'username' => ['required', 'string', 'max:50', 'unique:users,username'],
            'full_name' => ['required', 'string', 'max:100'],
            'password' => ['required', 'string', Password::min(8)->letters()->numbers()],
            'contact_number' => ['nullable', 'string', 'max:20'],
            // There is exactly one Admin (seeded), so new accounts can only be Supervisor or Collector.
            'role' => ['required', 'in:Supervisor,Collector'],
        ]);

        $user = User::create($data);
        Audit::log('created', "Created {$user->role} account '{$user->username}'", $user);

        return response()->json($user, 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $rules = [
            'username' => ['required', 'string', 'max:50', Rule::unique('users')->ignore($user)],
            'full_name' => ['required', 'string', 'max:100'],
            'password' => ['nullable', 'string', Password::min(8)->letters()->numbers()], // blank = keep current
            'contact_number' => ['nullable', 'string', 'max:20'],
        ];

        // Nobody can be promoted to Admin. The Admin's own role is fixed: it is not validated
        // or saved at all, so whatever is sent for it is ignored.
        if ($user->role !== 'Admin') {
            $rules['role'] = ['required', 'in:Supervisor,Collector'];
        }

        $data = $request->validate($rules);

        if (empty($data['password'])) {
            unset($data['password']);
        }

        $passwordChanged = isset($data['password']);
        $before = Audit::snapshot($user);
        $user->update($data);
        if ($passwordChanged) {
            $user->tokens()->delete(); // a reset password signs that person out everywhere
        }
        Audit::log('updated', "Edited account '{$user->username}' (".Audit::diff($before, $user).($passwordChanged ? '; password reset' : '').')', $user);

        return response()->json($user);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($user->role === 'Admin') {
            return response()->json(['message' => 'The Admin account cannot be deleted.'], 422);
        }

        $user->delete();
        Audit::log('deleted', "Deleted account '{$user->username}'", $user);

        return response()->json(['message' => 'User deleted.']);
    }
}