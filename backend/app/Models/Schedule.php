<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Schedule extends Model
{
    protected $fillable = [
        'bin_id', 'collector_id', 'vehicle_id', 'collection_route_id', 'scheduled_date',
        'waste_type', 'waste_amount_kg', 'status', 'notes',
    ];

    protected function casts(): array
    {
        return ['scheduled_date' => 'date:Y-m-d'];
    }

    public function bin(): BelongsTo
    {
        return $this->belongsTo(Bin::class);
    }

    public function collector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'collector_id');
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function route(): BelongsTo
    {
        return $this->belongsTo(CollectionRoute::class, 'collection_route_id');
    }

    public function record(): HasOne
    {
        return $this->hasOne(CollectionRecord::class);
    }

    /** Live search/filter (replaces CollectionSchedule::search() from the PHP version). */
    public function scopeFilter(Builder $q, array $f): Builder
    {
        return $q
            ->when($f['keyword'] ?? null, function ($q, $kw) {
                $q->where(function ($q) use ($kw) {
                    $q->whereHas('bin', fn ($b) => $b->where('location', 'like', "%$kw%")->orWhere('area', 'like', "%$kw%"))
                      ->orWhereHas('collector', fn ($u) => $u->where('full_name', 'like', "%$kw%"));
                });
            })
            ->when($f['waste_type'] ?? null, fn ($q, $v) => $q->where('waste_type', $v))
            ->when($f['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->when($f['date_from'] ?? null, fn ($q, $v) => $q->whereDate('scheduled_date', '>=', $v))
            ->when($f['date_to'] ?? null, fn ($q, $v) => $q->whereDate('scheduled_date', '<=', $v));
    }

    public function scopeOverdue(Builder $q): Builder
    {
        return $q->where('status', 'Pending')->whereDate('scheduled_date', '<', today());
    }
}
