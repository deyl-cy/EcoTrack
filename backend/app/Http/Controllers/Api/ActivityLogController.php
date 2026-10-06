<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Admin-only audit trail. */
class ActivityLogController extends Controller
{
    /** GET /api/activity-logs?keyword=&action=&date_from=&date_to=&page= */
    public function index(Request $request): JsonResponse
    {
        $logs = ActivityLog::query()
            ->when($request->query('keyword'), function ($q, $kw) {
                $q->where(fn ($q) => $q->where('description', 'like', "%$kw%")->orWhere('username', 'like', "%$kw%"));
            })
            ->when($request->query('action'), fn ($q, $v) => $q->where('action', $v))
            ->when($request->query('date_from'), fn ($q, $v) => $q->whereDate('created_at', '>=', $v))
            ->when($request->query('date_to'), fn ($q, $v) => $q->whereDate('created_at', '<=', $v))
            ->orderByDesc('id')
            ->paginate(min((int) $request->query('per_page', 25), 100))
            ->through(fn ($l) => [
                'id' => $l->id,
                'created_at' => $l->created_at?->format('Y-m-d H:i:s'),
                'username' => $l->username,
                'action' => $l->action,
                'description' => $l->description,
                'ip_address' => $l->ip_address,
            ]);

        return response()->json([
            'data' => $logs->items(),
            'meta' => ['current_page' => $logs->currentPage(), 'last_page' => $logs->lastPage(), 'total' => $logs->total()],
            'actions' => ActivityLog::query()->distinct()->orderBy('action')->pluck('action'),
        ]);
    }
}
