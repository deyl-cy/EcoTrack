<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Loads the same sample data as the original waste_management.sql
 * (Muñoz, Nueva Ecija bins, 3 roles, vehicles, one prepared route...).
 * Passwords are the original ones — bcrypt hashes copied as-is.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $data = require __DIR__.'/data/seed.php';

        // Order matters: parents before children (foreign keys).
        foreach (['users', 'bins', 'vehicles', 'collection_routes', 'schedules', 'collection_records'] as $table) {
            DB::table($table)->insert($data[$table]);
        }

        $this->call(BinLocationSeeder::class); // approximate map positions for the sample bins
    }
}
