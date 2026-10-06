<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Bin;
use App\Models\CollectionRoute;
use App\Models\Schedule;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Security, profile, activity log, map and notifications. */
class HardeningTest extends TestCase
{
    use RefreshDatabase;

    private function bin(array $extra = []): Bin
    {
        return Bin::create($extra + ['location' => 'Market', 'area' => 'Poblacion', 'capacity_kg' => 100, 'current_level' => 'Low']);
    }

    public function test_login_is_locked_after_five_failed_attempts(): void
    {
        User::factory()->create(['username' => 'maria']);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/login', ['username' => 'maria', 'password' => 'wrong'])->assertStatus(422);
        }

        // even the right password is refused while locked out
        $this->postJson('/api/login', ['username' => 'maria', 'password' => 'password'])->assertStatus(429);
    }

    public function test_successful_login_is_not_counted_against_the_limit(): void
    {
        User::factory()->create(['username' => 'maria']);

        for ($i = 0; $i < 8; $i++) {
            $this->postJson('/api/login', ['username' => 'maria', 'password' => 'password'])->assertOk();
        }
    }

    public function test_collector_cannot_open_another_collectors_route_stops(): void
    {
        $owner = User::factory()->create();
        $route = CollectionRoute::create([
            'name' => 'R1', 'collector_id' => $owner->id, 'route_date' => today(),
            'vehicle_id' => Vehicle::create(['plate_number' => 'AAA 111', 'vehicle_type' => 'Truck', 'capacity_kg' => 500])->id,
            'created_by' => $owner->id,
        ]);

        Sanctum::actingAs(User::factory()->create());
        $this->getJson("/api/routes/{$route->id}/stops")->assertStatus(403);

        Sanctum::actingAs($owner);
        $this->getJson("/api/routes/{$route->id}/stops")->assertOk();
    }

    public function test_schedules_can_only_be_assigned_to_collectors(): void
    {
        $bin = $this->bin();
        $supervisor = User::factory()->role('Supervisor')->create();
        Sanctum::actingAs($supervisor);

        $this->postJson('/api/schedules', [
            'bin_id' => $bin->id, 'collector_id' => $supervisor->id, 'scheduled_date' => today()->toDateString(),
            'waste_type' => 'Recyclable', 'status' => 'Pending',
        ])->assertStatus(422)->assertJsonValidationErrors('collector_id');
    }

    public function test_profile_can_be_updated(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->putJson('/api/profile', ['full_name' => 'New Name', 'email' => 'new@example.com', 'contact_number' => '0999'])->assertOk();

        $this->assertSame('New Name', $user->fresh()->full_name);
        $this->assertSame('new@example.com', $user->fresh()->email);
    }

    public function test_password_change_needs_the_current_password_and_a_strong_new_one(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->putJson('/api/profile/password', ['current_password' => 'nope', 'password' => 'newpass123', 'password_confirmation' => 'newpass123'])
            ->assertStatus(422)->assertJsonValidationErrors('current_password');

        $this->putJson('/api/profile/password', ['current_password' => 'password', 'password' => 'short', 'password_confirmation' => 'short'])
            ->assertStatus(422)->assertJsonValidationErrors('password');

        $this->putJson('/api/profile/password', ['current_password' => 'password', 'password' => 'newpass123', 'password_confirmation' => 'newpass123'])
            ->assertOk();

        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('newpass123', $user->fresh()->password));
    }

    public function test_activity_log_records_changes_and_is_admin_only(): void
    {
        Sanctum::actingAs(User::factory()->role('Admin')->create());
        $this->postJson('/api/bins', ['location' => 'Plaza', 'area' => 'Centro', 'capacity_kg' => 50, 'current_level' => 'Low'])->assertCreated();

        $this->assertDatabaseHas('activity_logs', ['action' => 'created', 'subject_type' => 'Bin']);
        $this->getJson('/api/activity-logs')->assertOk()->assertJsonPath('data.0.action', 'created');

        Sanctum::actingAs(User::factory()->role('Supervisor')->create());
        $this->getJson('/api/activity-logs')->assertStatus(403);
    }

    public function test_failed_logins_are_logged_without_the_password(): void
    {
        $this->postJson('/api/login', ['username' => 'ghost', 'password' => 'secret-guess'])->assertStatus(422);

        $log = ActivityLog::where('action', 'login_failed')->first();
        $this->assertNotNull($log);
        $this->assertStringNotContainsString('secret-guess', $log->description);
    }

    public function test_bins_accept_optional_coordinates(): void
    {
        Sanctum::actingAs(User::factory()->role('Admin')->create());
        $base = ['location' => 'Plaza', 'area' => 'Centro', 'capacity_kg' => 50, 'current_level' => 'Low'];

        $this->postJson('/api/bins', $base + ['latitude' => 15.71, 'longitude' => 120.9])->assertCreated()->assertJsonPath('latitude', 15.71);
        $this->postJson('/api/bins', $base + ['latitude' => 15.71])->assertStatus(422)->assertJsonValidationErrors('longitude');
        $this->postJson('/api/bins', $base + ['latitude' => 120, 'longitude' => 10])->assertStatus(422)->assertJsonValidationErrors('latitude');
    }

    public function test_map_shows_all_bins_to_staff_but_only_assigned_bins_to_collectors(): void
    {
        $mine = User::factory()->create();
        $assigned = $this->bin(['location' => 'Assigned', 'latitude' => 15.7, 'longitude' => 120.9]);
        $this->bin(['location' => 'Other']);
        Schedule::create([
            'bin_id' => $assigned->id, 'collector_id' => $mine->id, 'scheduled_date' => today(),
            'waste_type' => 'Recyclable', 'status' => 'Pending',
        ]);

        Sanctum::actingAs(User::factory()->role('Supervisor')->create());
        $this->getJson('/api/map')->assertOk()->assertJsonCount(2, 'bins')->assertJsonPath('missing_coordinates', 1);

        Sanctum::actingAs($mine);
        $this->getJson('/api/map')->assertOk()->assertJsonCount(1, 'bins')->assertJsonPath('bins.0.location', 'Assigned');
    }

    public function test_notifications_flag_overdue_pickups_for_the_collector(): void
    {
        $collector = User::factory()->create();
        Schedule::create([
            'bin_id' => $this->bin()->id, 'collector_id' => $collector->id, 'scheduled_date' => today()->subDays(2),
            'waste_type' => 'Recyclable', 'status' => 'Pending',
        ]);

        Sanctum::actingAs($collector);
        $this->getJson('/api/notifications')->assertOk()->assertJsonPath('count', 1)->assertJsonPath('items.0.type', 'overdue');
    }
}
