<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Bin extends Model
{
    protected $fillable = ['location', 'area', 'capacity_kg', 'current_level'];

    public function schedules(): HasMany
    {
        return $this->hasMany(Schedule::class);
    }
}
