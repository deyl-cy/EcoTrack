<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Flattens a Schedule + its relations into the shape the React tables need. */
class ScheduleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'bin_id' => $this->bin_id,
            'collector_id' => $this->collector_id,
            'vehicle_id' => $this->vehicle_id,
            'collection_route_id' => $this->collection_route_id,
            'scheduled_date' => $this->scheduled_date?->format('Y-m-d'),
            'waste_type' => $this->waste_type,
            'waste_amount_kg' => $this->waste_amount_kg,
            'status' => $this->status,
            'notes' => $this->notes,
            'is_overdue' => $this->status === 'Pending' && $this->scheduled_date?->isBefore(today()),
            'location' => $this->bin?->location,
            'area' => $this->bin?->area,
            'collector_name' => $this->collector?->full_name,
            'plate_number' => $this->vehicle?->plate_number,
            'route_name' => $this->route?->name,
        ];
    }
}
