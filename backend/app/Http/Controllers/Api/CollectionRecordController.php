<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CollectionRecord;
use App\Models\Schedule;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CollectionRecordController extends Controller
{
    /**
     * POST /api/records — a collector finishes a pickup.
     * Inside ONE database transaction: log the record, complete the schedule,
     * reset the bin level, and update the route status.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'schedule_id' => ['required', 'exists:schedules,id'],
            'actual_weight_kg' => ['required', 'numeric', 'min:0', 'max:99999'],
            'remarks' => ['nullable', 'string', 'max:255'],
        ]);

        $schedule = Schedule::with(['bin', 'route'])->findOrFail($data['schedule_id']);

        if ($schedule->collector_id !== $request->user()->id) {
            return response()->json(['message' => 'This schedule is not assigned to you.'], 403);
        }
        if ($schedule->status === 'Completed') {
            return response()->json(['message' => 'This pickup was already completed.'], 422);
        }

        DB::transaction(function () use ($data, $schedule, $request) {
            CollectionRecord::create($data + [
                'collector_id' => $request->user()->id,
                'collected_at' => now(),
            ]);
            $schedule->update(['status' => 'Completed']);
            $schedule->bin->update(['current_level' => 'Low']);
            $schedule->route?->syncStatus();
        });

        Audit::log('collected', "Recorded pickup at {$schedule->bin->location} ({$data['actual_weight_kg']} kg)", $schedule);

        return response()->json(['message' => 'Collection recorded.'], 201);
    }
}
