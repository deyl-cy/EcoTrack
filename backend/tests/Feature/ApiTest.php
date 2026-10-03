<?php

namespace Tests\Feature;

use App\Models\Bin;
use App\Models\Schedule;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_returns_token(): void
    {
        User::factory()->create(['username' => 'admin', 'role' => 'Admin']);

        $this->postJson('/api/login', ['username' => 'admin', 'password' => 'password'])
            ->assertOk()->assertJsonStructure(['token', 'user']);

        $this->postJson('/api/login', ['username' => 'admin', 'password' => 'wrong'])
            ->assertStatus(422);
    }

    public function test_guests_are_rejected(): void
    {
        $this->getJson('/api/bins')->assertStatus(401);
    }

    public function test_only_admin_can_create_bins(): void
    {
        $payload = ['location' => 'Test', 'area' => 'Area', 'capacity_kg' => 100, 'current_level' => 'Low'];

        Sanctum::actingAs(User::factory()->role('Supervisor')->create());
        $this->postJson('/api/bins', $payload)->assertStatus(403);

        Sanctum::actingAs(User::factory()->role('Admin')->create());
        $this->postJson('/api/bins', $payload)->assertCreated();
    }

    public function test_collector_completes_own_pickup_and_bin_resets(): void
    {
        $collector = User::factory()->create();
        $bin = Bin::create(['location' => 'X', 'area' => 'Y', 'capacity_kg' => 50, 'current_level' => 'Full']);
        $schedule = Schedule::create([
            'bin_id' => $bin->id, 'collector_id' => $collector->id, 'scheduled_date' => today(),
            'waste_type' => 'Recyclable', 'status' => 'Pending',
        ]);

        Sanctum::actingAs($collector);
        $this->postJson('/api/records', ['schedule_id' => $schedule->id, 'actual_weight_kg' => 12.5])->assertCreated();

        $this->assertSame('Completed', $schedule->fresh()->status);
        $this->assertSame('Low', $bin->fresh()->current_level);
        $this->postJson('/api/records', ['schedule_id' => $schedule->id, 'actual_weight_kg' => 1])->assertStatus(422);
    }

    public function test_collector_cannot_complete_someone_elses_pickup(): void
    {
        $owner = User::factory()->create();
        $bin = Bin::create(['location' => 'X', 'area' => 'Y', 'capacity_kg' => 50]);
        $schedule = Schedule::create([
            'bin_id' => $bin->id, 'collector_id' => $owner->id, 'scheduled_date' => today(),
            'waste_type' => 'Recyclable', 'status' => 'Pending',
        ]);

        Sanctum::actingAs(User::factory()->create());
        $this->postJson('/api/records', ['schedule_id' => $schedule->id, 'actual_weight_kg' => 5])->assertStatus(403);
    }

    public function test_admin_role_is_fixed_and_unique(): void
    {
        $admin = User::factory()->role('Admin')->create();
        $staff = User::factory()->role('Collector')->create();
        Sanctum::actingAs($admin);

        $base = ['contact_number' => null];

        // cannot create another Admin
        $this->postJson('/api/users', array_merge($base, ['username' => 'second', 'full_name' => 'Second', 'password' => 'password1', 'role' => 'Admin']))
            ->assertStatus(422);

        // cannot promote someone to Admin
        $this->putJson("/api/users/{$staff->id}", array_merge($base, ['username' => $staff->username, 'full_name' => $staff->full_name, 'role' => 'Admin']))
            ->assertStatus(422);

        // the Admin's own role cannot be changed, but other fields can
        $this->putJson("/api/users/{$admin->id}", array_merge($base, ['username' => $admin->username, 'full_name' => 'Renamed', 'role' => 'Collector']))
            ->assertOk();
        $this->assertSame('Admin', $admin->fresh()->role);
        $this->assertSame('Renamed', $admin->fresh()->full_name);

        // the Admin cannot be deleted
        $this->deleteJson("/api/users/{$admin->id}")->assertStatus(422);
    }
}