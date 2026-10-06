<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Bin extends Model
{
    protected $fillable = ['location', 'area', 'latitude', 'longitude', 'capacity_kg', 'current_level'];

    protected function casts(): array
    {
        // decimals come out of MySQL as strings; the map needs real numbers
        return ['latitude' => 'float', 'longitude' => 'float'];
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(Schedule::class);
    }
}
