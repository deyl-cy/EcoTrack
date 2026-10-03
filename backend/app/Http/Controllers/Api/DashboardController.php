<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\RecordResource;
use App\Http\Resources\ScheduleResource;
use App\Models\Bin;
use App\Models\CollectionRecord;
use App\Models\Schedule;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DashboardController extends Controller
{
    /** GET /api/dashboard — headline numbers + bins that need collecting. */
    public function summary(): JsonResponse
    {
        return response()->json([
            'bins' => Bin::count(),
            'vehicles' => Vehicle::count(),
            'collectors' => User::where('role', 'Collector')->count(),
            'schedules' => Schedule::count(),
            'pending' => Schedule::where('status', 'Pending')->count(),
            'completed' => Schedule::where('status', 'Completed')->count(),
            'overdue' => Schedule::overdue()->count(),
            'bins_by_level' => Bin::selectRaw('current_level, COUNT(*) as total')->groupBy('current_level')->pluck('total', 'current_level'),
            'bins_needing_collection' => Bin::whereIn('current_level', ['High', 'Full'])
                ->orderByRaw("FIELD(current_level, 'Full', 'High')")->get(),
        ]);
    }

    /** GET /api/monitor — supervisor status monitor: workload per collector + overdue pickups. */
    public function monitor()
    {
        $byCollector = User::where('role', 'Collector')
            ->withCount([
                'schedules as total',
                'schedules as pending' => fn ($q) => $q->where('status', 'Pending'),
                'schedules as completed' => fn ($q) => $q->where('status', 'Completed'),
            ])
            ->orderBy('full_name')
            ->get(['id', 'full_name'])
            ->map(fn ($u) => [
                'id' => $u->id, 'collector_name' => $u->full_name,
                'total' => $u->total, 'pending' => $u->pending, 'completed' => $u->completed,
            ]);

        $overdue = Schedule::overdue()->with(['bin', 'collector', 'vehicle', 'route'])->orderBy('scheduled_date')->get();

        return response()->json([
            'by_collector' => $byCollector,
            'overdue' => ScheduleResource::collection($overdue),
        ]);
    }

    private function recordQuery(Request $request)
    {
        return CollectionRecord::with(['schedule.bin', 'collector'])
            ->when($request->query('date_from'), fn ($q, $v) => $q->whereDate('collected_at', '>=', $v))
            ->when($request->query('date_to'), fn ($q, $v) => $q->whereDate('collected_at', '<=', $v))
            ->orderByDesc('collected_at');
    }

    /** GET /api/reports — admin collection report with totals (+ breakdown by waste type). */
    public function report(Request $request)
    {
        $records = $this->recordQuery($request)->get();

        return response()->json([
            'summary' => [
                'total_pickups' => $records->count(),
                'total_weight_kg' => round($records->sum('actual_weight_kg'), 2),
                'by_waste_type' => $records->groupBy(fn ($r) => $r->schedule?->waste_type)
                    ->map(fn ($g) => round($g->sum('actual_weight_kg'), 2)),
            ],
            'data' => RecordResource::collection($records),
        ]);
    }

    /** GET /api/reports/export — the same report as a designed CSV download (title, summary, then details). */
    public function exportCsv(Request $request): StreamedResponse
    {
        $records = $this->recordQuery($request)->get();
        $from = $request->query('date_from');
        $to = $request->query('date_to');
        $range = ($from && $to) ? "$from to $to" : ($from ? "From $from" : ($to ? "Up to $to" : 'All dates'));
        $byType = $records->groupBy(fn ($r) => $r->schedule?->waste_type);
        $filename = 'ecotrack-report-'.now()->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($records, $range, $byType) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // UTF-8 BOM so Excel shows names like "Muñoz" correctly

            fputcsv($out, ['EcoTrack - Collection Report']);
            fputcsv($out, ['Date range', $range]);
            fputcsv($out, ['Generated', now()->format('Y-m-d H:i')]);
            fputcsv($out, []);

            fputcsv($out, ['SUMMARY']);
            fputcsv($out, ['Total pickups', $records->count()]);
            fputcsv($out, ['Total weight (kg)', number_format($records->sum('actual_weight_kg'), 2, '.', '')]);
            foreach ($byType as $type => $group) {
                fputcsv($out, ["$type (kg)", number_format($group->sum('actual_weight_kg'), 2, '.', '')]);
            }
            fputcsv($out, []);

            fputcsv($out, ['DETAILS']);
            fputcsv($out, ['Collected At', 'Location', 'Area', 'Waste Type', 'Weight (kg)', 'Collector', 'Remarks']);
            foreach ($records as $r) {
                fputcsv($out, [
                    $r->collected_at->format('Y-m-d H:i'), $r->schedule?->bin?->location, $r->schedule?->bin?->area,
                    $r->schedule?->waste_type, number_format($r->actual_weight_kg, 2, '.', ''),
                    $r->collector?->full_name, $r->remarks,
                ]);
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}