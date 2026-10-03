<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CollectionRoute extends Model
{
    protected $fillable = ['name', 'collector_id', 'vehicle_id', 'route_date', 'status', 'notes', 'created_by'];

    protected function casts(): array
    {
        return ['route_date' => 'date:Y-m-d'];
    }

    public function collector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'collector_id');
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function stops(): HasMany
    {
        return $this->hasMany(Schedule::class)->with('bin')->orderBy('id');
    }

    /** Enhancement: once every stop is done, the route closes itself. */
    public function syncStatus(): void
    {
        $total = $this->schedules()->count();
        if ($total > 0 && $this->schedules()->where('status', 'Pending')->count() === 0) {
            $this->update(['status' => 'Completed']);
        } elseif ($this->schedules()->where('status', 'Completed')->exists()) {
            $this->update(['status' => 'In Progress']);
        }
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(Schedule::class);
    }
}
