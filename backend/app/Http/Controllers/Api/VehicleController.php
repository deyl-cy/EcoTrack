<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class VehicleController extends Controller
{
    private function rules(?Vehicle $vehicle = null): array
    {
        return [
            'plate_number' => ['required', 'string', 'max:20', Rule::unique('vehicles')->ignore($vehicle)],
            'vehicle_type' => ['required', 'string', 'max:50'],
            'capacity_kg' => ['required', 'numeric', 'min:1'],
            'status' => ['required', 'in:Available,On Route,Maintenance'],
        ];
    }

    public function index(): JsonResponse
    {
        return response()->json(Vehicle::orderBy('id')->get());
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(Vehicle::create($request->validate($this->rules())), 201);
    }

    public function update(Request $request, Vehicle $vehicle): JsonResponse
    {
        $vehicle->update($request->validate($this->rules($vehicle)));

        return response()->json($vehicle);
    }

    public function destroy(Vehicle $vehicle): JsonResponse
    {
        $vehicle->delete();

        return response()->json(['message' => 'Vehicle deleted.']);
    }
}
