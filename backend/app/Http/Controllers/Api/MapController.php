<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bin;
use App\Models\CollectionRoute;
use App\Models\Schedule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * GET /api/map — everything the Map page draws.
 * Staff see every bin; a collector only sees the bins and routes assigned to them.
 */
class MapController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $isCollector = $user->hasRole('Collector');
        $date = $request->query('date'); // optional Y-m-d: show that day's routes instead of the active ones

        // Pending pickups tell us which bins are waiting and which are overdue.
        $pending = Schedule::where('status', 'Pending')
            ->when($isCollector, fn ($q) => $q->where('collector_id', $user->id))
            ->orderBy('scheduled_date')->orderBy('id')
            ->get(['id', 'bin_id', 'scheduled_date'])
            ->groupBy('bin_id');

        $bins = Bin::query()
            ->when($isCollector, fn ($q) => $q->whereIn('id', $pending->keys()))
            ->orderBy('id')
            ->get()
            ->map(function (Bin $b) use ($pending) {
                $waiting = $pending->get($b->id, collect());

                return [
                    'id' => $b->id,
                    'location' => $b->location,
                    'area' => $b->area,
                    'current_level' => $b->current_level,
                    'capacity_kg' => $b->capacity_kg,
                    'latitude' => $b->latitude,
                    'longitude' => $b->longitude,
                    'pending_count' => $waiting->count(),
                    'overdue' => $waiting->contains(fn ($s) => $s->scheduled_date->isBefore(today())),
                    'next_schedule_id' => $waiting->first()?->id,
                ];
            });

        $routes = CollectionRoute::with(['collector', 'vehicle', 'schedules.bin'])
            ->when($isCollector, fn ($q) => $q->where('collector_id', $user->id))
            ->when(
                $date,
                fn ($q) => $q->whereDate('route_date', $date),
                fn ($q) => $q->whereIn('status', ['Planned', 'In Progress'])
            )
            ->orderBy('route_date')->orderBy('id')
            ->get()
            ->map(fn (CollectionRoute $r) => [
                'id' => $r->id,
                'name' => $r->name,
                'status' => $r->status,
                'route_date' => $r->route_date->format('Y-m-d'),
                'collector_name' => $r->collector?->full_name,
                'plate_number' => $r->vehicle?->plate_number,
                'stops' => $r->schedules->sortBy('id')->values()->map(fn ($s, $i) => [
                    'order' => $i + 1,
                    'schedule_id' => $s->id,
                    'bin_id' => $s->bin_id,
                    'location' => $s->bin?->location,
                    'status' => $s->status,
                    'latitude' => $s->bin?->latitude,
                    'longitude' => $s->bin?->longitude,
                ]),
            ]);

        return response()->json([
            'bins' => $bins,
            'routes' => $routes,
            'missing_coordinates' => $bins->filter(fn ($b) => $b['latitude'] === null || $b['longitude'] === null)->count(),
        ]);
    }
}
