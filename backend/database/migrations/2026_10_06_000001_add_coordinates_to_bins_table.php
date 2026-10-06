<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// GPS position of each bin, used by the Map page. Nullable: bins without one simply aren't pinned.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bins', function (Blueprint $table) {
            $table->decimal('latitude', 10, 7)->nullable()->after('area');
            $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
        });
    }

    public function down(): void
    {
        Schema::table('bins', function (Blueprint $table) {
            $table->dropColumn(['latitude', 'longitude']);
        });
    }
};
