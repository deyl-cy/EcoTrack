<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

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
            'password' => ['required', 'string', 'min:8'],
            'contact_number' => ['nullable', 'string', 'max:20'],
            // There is exactly one Admin (seeded), so new accounts can only be Supervisor or Collector.
            'role' => ['required', 'in:Supervisor,Collector'],
        ]);

        return response()->json(User::create($data), 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $rules = [
            'username' => ['required', 'string', 'max:50', Rule::unique('users')->ignore($user)],
            'full_name' => ['required', 'string', 'max:100'],
            'password' => ['nullable', 'string', 'min:8'], // blank = keep current
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

        $user->update($data);

        return response()->json($user);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($user->role === 'Admin') {
            return response()->json(['message' => 'The Admin account cannot be deleted.'], 422);
        }

        $user->delete();

        return response()->json(['message' => 'User deleted.']);
    }
}