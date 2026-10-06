<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ScheduleResource;
use App\Models\CollectionRoute;
use App\Models\Schedule;
use App\Models\Vehicle;
use App\Support\Audit;
use Illuminate\Validation\Rule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ScheduleController extends Controller
{
    private const WITH = ['bin', 'collector', 'vehicle', 'route'];

    private function rules(): array
    {
        return [
            'bin_id' => ['required', 'exists:bins,id'],
            'collector_id' => ['required', Rule::exists('users', 'id')->where('role', 'Collector')],
            'vehicle_id' => ['nullable', 'exists:vehicles,id'],
            'collection_route_id' => ['nullable', 'exists:collection_routes,id'],
            'scheduled_date' => ['required', 'date'],
            'waste_type' => ['required', 'in:Biodegradable,Non-Biodegradable,Recyclable'],
            'waste_amount_kg' => ['nullable', 'numeric', 'min:0'],
            'status' => ['required', 'in:Pending,Completed'],
            'notes' => ['nullable', 'string', 'max:255'],
        ];
    }

    /** A truck that is in the workshop cannot be scheduled (enhancement over the PHP version). */
    private function checkVehicle(array $data): ?JsonResponse
    {
        if (! empty($data['vehicle_id']) && Vehicle::find($data['vehicle_id'])->status === 'Maintenance') {
            return response()->json(['message' => 'That vehicle is under maintenance.'], 422);
        }

        return null;
    }

    /** GET /api/schedules — live search + filters + pagination. Collectors only ever see their own. */
    public function index(Request $request)
    {
        $user = $request->user();

        $schedules = Schedule::with(self::WITH)
            ->when($user->hasRole('Collector'), fn ($q) => $q->where('collector_id', $user->id))
            ->filter($request->only(['keyword', 'waste_type', 'status', 'date_from', 'date_to']))
            ->orderByDesc('scheduled_date')->orderByDesc('id')
            ->paginate(min((int) $request->query('per_page', 10), 200));

        return ScheduleResource::collection($schedules);
    }

    public function show(Request $request, Schedule $schedule): ScheduleResource|JsonResponse
    {
        if ($request->user()->hasRole('Collector') && $schedule->collector_id !== $request->user()->id) {
            return response()->json(['message' => 'This schedule is not assigned to you.'], 403);
        }

        return new ScheduleResource($schedule->load(self::WITH));
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules());
        if ($error = $this->checkVehicle($data)) {
            return $error;
        }

        $schedule = Schedule::create($data);
        $schedule->route?->syncStatus();
        Audit::log('created', 'Scheduled a pickup for '.$schedule->load('bin')->bin?->location." on {$schedule->scheduled_date->format('Y-m-d')}", $schedule);

        return (new ScheduleResource($schedule->load(self::WITH)))->response()->setStatusCode(201);
    }

    public function update(Request $request, Schedule $schedule)
    {
        $data = $request->validate($this->rules());
        if ($error = $this->checkVehicle($data)) {
            return $error;
        }

        $oldRouteId = $schedule->collection_route_id;
        $before = Audit::snapshot($schedule);
        $schedule->update($data);
        Audit::log('updated', 'Edited schedule #'.$schedule->id.' ('.Audit::diff($before, $schedule).')', $schedule);

        // keep both the old and new route's status in sync
        foreach (array_filter([$oldRouteId, $schedule->collection_route_id]) as $id) {
            CollectionRoute::find($id)?->syncStatus();
        }

        return new ScheduleResource($schedule->load(self::WITH));
    }

    public function destroy(Schedule $schedule): JsonResponse
    {
        $schedule->loadMissing('bin');
        $schedule->delete();
        Audit::log('deleted', 'Deleted the schedule for '.$schedule->bin?->location." on {$schedule->scheduled_date->format('Y-m-d')}", $schedule);

        return response()->json(['message' => 'Schedule deleted.']);
    }
}
