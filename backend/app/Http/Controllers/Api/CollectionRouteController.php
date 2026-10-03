<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ScheduleResource;
use App\Models\CollectionRoute;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CollectionRouteController extends Controller
{
    private function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'collector_id' => ['required', 'exists:users,id'],
            'vehicle_id' => ['required', 'exists:vehicles,id'],
            'route_date' => ['required', 'date'],
            'status' => ['sometimes', 'in:Planned,In Progress,Completed'],
            'notes' => ['nullable', 'string', 'max:255'],
        ];
    }

    private function shape(CollectionRoute $r): array
    {
        return [
            'id' => $r->id,
            'name' => $r->name,
            'collector_id' => $r->collector_id,
            'vehicle_id' => $r->vehicle_id,
            'route_date' => $r->route_date->format('Y-m-d'),
            'status' => $r->status,
            'notes' => $r->notes,
            'collector_name' => $r->collector?->full_name,
            'plate_number' => $r->vehicle?->plate_number,
            'stop_count' => $r->schedules_count ?? $r->schedules()->count(),
        ];
    }

    public function index(Request $request): JsonResponse
    {
        $routes = CollectionRoute::with(['collector', 'vehicle'])->withCount('schedules')
            ->when($request->user()->hasRole('Collector'), fn ($q) => $q->where('collector_id', $request->user()->id))
            ->orderByDesc('route_date')->orderByDesc('id')
            ->get()
            ->map(fn ($r) => $this->shape($r));

        return response()->json($routes);
    }

    /** GET /api/routes/{id}/stops — the bins on a route. */
    public function stops(CollectionRoute $route)
    {
        return ScheduleResource::collection($route->schedules()->with(['bin', 'collector', 'vehicle', 'route'])->orderBy('id')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules());
        $route = CollectionRoute::create($data + ['created_by' => $request->user()->id]);

        return response()->json($this->shape($route->load(['collector', 'vehicle'])), 201);
    }

    public function update(Request $request, CollectionRoute $route): JsonResponse
    {
        $route->update($request->validate($this->rules()));

        return response()->json($this->shape($route->load(['collector', 'vehicle'])));
    }

    public function destroy(CollectionRoute $route): JsonResponse
    {
        $route->delete(); // schedules keep existing; their collection_route_id becomes null (nullOnDelete)

        return response()->json(['message' => 'Route deleted.']);
    }
}
