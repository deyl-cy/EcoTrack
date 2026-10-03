<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RecordResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'schedule_id' => $this->schedule_id,
            'collected_at' => $this->collected_at?->format('Y-m-d H:i'),
            'location' => $this->schedule?->bin?->location,
            'area' => $this->schedule?->bin?->area,
            'waste_type' => $this->schedule?->waste_type,
            'actual_weight_kg' => $this->actual_weight_kg,
            'remarks' => $this->remarks,
            'collector_name' => $this->collector?->full_name,
        ];
    }
}
