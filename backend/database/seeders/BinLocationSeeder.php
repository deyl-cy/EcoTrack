<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Gives the sample bins APPROXIMATE map positions, so the Map page has something to show.
 * Each bin is placed near the middle of its barangay with a small fixed offset.
 * These are placeholders: correct them from Bins > Edit > pick the spot on the map.
 *
 * Run on an existing database with:  php artisan db:seed --class=BinLocationSeeder
 */
class BinLocationSeeder extends Seeder
{
    private const CENTERS = [
        'Barangay Bantug' => [15.7375, 120.9345],
        'Barangay Poblacion East' => [15.7130, 120.9055],
        'Barangay Poblacion West' => [15.7120, 120.8985],
        'Barangay Matingkis' => [15.7250, 120.9150],
        'Barangay San Andres' => [15.7000, 120.8900],
        'Barangay Bagong Sikat' => [15.7280, 120.9250],
        'Barangay Catalanacan' => [15.7450, 120.9000],
        'Barangay Villa Cuizon' => [15.7000, 120.9200],
    ];

    public function run(): void
    {
        foreach (DB::table('bins')->get(['id', 'area']) as $bin) {
            $center = self::CENTERS[$bin->area] ?? null;
            if (! $center) {
                continue;
            }
            // deterministic offset of up to roughly 300 m, so pins in one barangay don't overlap
            $dLat = ((($bin->id * 37) % 61) - 30) / 10000;
            $dLng = ((($bin->id * 53) % 61) - 30) / 10000;

            DB::table('bins')->where('id', $bin->id)->whereNull('latitude')->update([
                'latitude' => round($center[0] + $dLat, 7),
                'longitude' => round($center[1] + $dLng, 7),
            ]);
        }
    }
}
