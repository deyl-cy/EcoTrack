<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bin;
use App\Models\Schedule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * GET /api/notifications — what needs attention right now, worked out live (nothing is stored).
 * The navbar bell polls this. Staff see overdue pickups and full bins nobody is scheduled for;
 * collectors see their own overdue and due-today pickups.
 */
class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $items = [];

        if ($user->hasRole('Collector')) {
            $mine = fn () => Schedule::with('bin')->where('collector_id', $user->id)->where('status', 'Pending');

            foreach ($mine()->overdue()->orderBy('scheduled_date')->limit(10)->get() as $s) {
                $items[] = [
                    'id' => "overdue-{$s->id}", 'type' => 'overdue', 'severity' => 'danger',
                    'title' => 'Overdue pickup', 'detail' => "{$s->bin?->location} · was due {$s->scheduled_date->format('M j')}",
                    'link' => "/assignments/{$s->id}",
                ];
            }
            foreach ($mine()->whereDate('scheduled_date', today())->limit(10)->get() as $s) {
                $items[] = [
                    'id' => "today-{$s->id}", 'type' => 'today', 'severity' => 'info',
                    'title' => 'Due today', 'detail' => "{$s->bin?->location} · {$s->waste_type}",
                    'link' => "/assignments/{$s->id}",
                ];
            }
        } else {
            foreach (Schedule::with(['bin', 'collector'])->overdue()->orderBy('scheduled_date')->limit(10)->get() as $s) {
                $items[] = [
                    'id' => "overdue-{$s->id}", 'type' => 'overdue', 'severity' => 'danger',
                    'title' => 'Overdue pickup', 'detail' => "{$s->bin?->location} · {$s->collector?->full_name} · due {$s->scheduled_date->format('M j')}",
                    'link' => '/monitor',
                ];
            }
            // Bins that are High/Full and have no pickup booked at all.
            $unscheduled = Bin::whereIn('current_level', ['Full', 'High'])
                ->whereDoesntHave('schedules', fn ($q) => $q->where('status', 'Pending'))
                ->orderBy('id')->limit(10)->get();
            foreach ($unscheduled as $b) {
                $items[] = [
                    'id' => "bin-{$b->id}", 'type' => 'bin', 'severity' => $b->current_level === 'Full' ? 'danger' : 'warning',
                    'title' => "Bin is {$b->current_level} with no pickup scheduled", 'detail' => $b->location,
                    'link' => '/schedules',
                ];
            }
        }

        return response()->json(['count' => count($items), 'items' => $items]);
    }
}
