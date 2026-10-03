<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bins', function (Blueprint $table) {
            $table->id();
            $table->string('location', 150);
            $table->string('area', 100);
            $table->decimal('capacity_kg', 6, 2);
            $table->enum('current_level', ['Low', 'Medium', 'High', 'Full'])->default('Low');
            $table->timestamps();
        });

        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();
            $table->string('plate_number', 20)->unique();
            $table->string('vehicle_type', 50);
            $table->decimal('capacity_kg', 7, 2);
            $table->enum('status', ['Available', 'On Route', 'Maintenance'])->default('Available');
            $table->timestamps();
        });

        // A "route" = one collector + one vehicle on one date, grouping several bin pickups (stops).
        Schema::create('collection_routes', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->foreignId('collector_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('vehicle_id')->constrained('vehicles')->cascadeOnDelete();
            $table->date('route_date');
            $table->enum('status', ['Planned', 'In Progress', 'Completed'])->default('Planned');
            $table->string('notes')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });

        Schema::create('schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bin_id')->constrained()->cascadeOnDelete();
            $table->foreignId('collector_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('vehicle_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('collection_route_id')->nullable()->constrained('collection_routes')->nullOnDelete();
            $table->date('scheduled_date');
            $table->enum('waste_type', ['Biodegradable', 'Non-Biodegradable', 'Recyclable']);
            $table->decimal('waste_amount_kg', 6, 2)->nullable();
            $table->enum('status', ['Pending', 'Completed'])->default('Pending');
            $table->string('notes')->nullable();
            $table->timestamps();
            $table->index(['status', 'scheduled_date']);
        });

        Schema::create('collection_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('schedule_id')->constrained()->cascadeOnDelete();
            $table->foreignId('collector_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('actual_weight_kg', 7, 2);
            $table->string('remarks')->nullable();
            $table->timestamp('collected_at')->useCurrent();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('collection_records');
        Schema::dropIfExists('schedules');
        Schema::dropIfExists('collection_routes');
        Schema::dropIfExists('vehicles');
        Schema::dropIfExists('bins');
    }
};
