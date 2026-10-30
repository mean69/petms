<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\OwnerProfile;
use App\Models\Pet;
use App\Models\User;
use App\Models\VaccineDefinition;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuditPrivacyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function client(): User
    {
        $user = User::factory()->create(['role_id' => 3]);
        OwnerProfile::factory()->create(['user_id' => $user->id]);

        return $user->fresh();
    }

    public function test_client_health_payloads_do_not_expose_recorder_identity_after_transfer(): void
    {
        $former = $this->client();
        $current = $this->client();
        $pet = Pet::factory()->ownedBy($former->ownerProfile)->create();
        $weight = $pet->weights()->create(['weight_kg' => 4, 'measured_at' => today(), 'recorded_by' => $former->id]);
        $admin = User::factory()->create(['role_id' => 1, 'contact_number' => '123', 'address' => 'Manila']);
        $this->actingAs($admin)->postJson('/api/v1/pets/'.$pet->id.'/transfer', ['owner_profile_id' => $current->ownerProfile->id, 'verification_reference' => 'Verified identity and signed document'])->assertOk();
        $this->actingAs($current)->getJson('/api/v1/pets/'.$pet->id)->assertOk()->assertJsonMissingPath('weights.0.recorded_by')->assertJsonMissingPath('weights.0.recorder')->assertJsonMissing(['name' => $former->name])->assertJsonMissing(['email' => $former->email]);
        $this->getJson('/api/v1/pets/'.$pet->id.'/weights/'.$weight->id)->assertOk()->assertJsonMissingPath('recorded_by')->assertJsonMissingPath('recorder');
    }

    public function test_weight_cannot_round_to_zero_and_clinical_update_keeps_original_recording_user(): void
    {
        $owner = $this->client();
        $pet = Pet::factory()->ownedBy($owner->ownerProfile)->create();
        $staff = User::factory()->create(['role_id' => 2, 'contact_number' => '123', 'address' => 'Manila']);
        $this->actingAs($staff);
        $this->postJson('/api/v1/pets/'.$pet->id.'/weights', ['weight_kg' => 0.0001, 'measured_at' => today()->toDateString()])->assertUnprocessable();
        $id = $this->postJson('/api/v1/pets/'.$pet->id.'/weights', ['weight_kg' => 4, 'measured_at' => today()->toDateString()])->assertCreated()->json('id');
        $admin = User::factory()->create(['role_id' => 1, 'contact_number' => '123', 'address' => 'Manila']);
        $this->actingAs($admin)->patchJson('/api/v1/pets/'.$pet->id.'/weights/'.$id, ['weight_kg' => 4.5])->assertOk()->assertJsonPath('recorded_by', $staff->id);
        $log = ActivityLog::where('action', 'clinical.weights.updated')->sole();
        $this->assertSame($admin->id, $log->actor_id);
        $this->assertEquals(4, $log->before_values['weight_kg']);
        $this->assertEquals(4.5, $log->after_values['weight_kg']);
    }

    public function test_dashboard_only_exposes_authorized_pets_and_latest_vaccine_record_due_date(): void
    {
        $first = $this->client();
        $other = $this->client();
        $pet = Pet::factory()->ownedBy($first->ownerProfile)->create();
        $otherPet = Pet::factory()->ownedBy($other->ownerProfile)->create();
        $vaccine = VaccineDefinition::first();
        $common = ['vaccine_definition_id' => $vaccine->id, 'recorded_by' => $first->id];
        $pet->vaccinations()->create([...$common, 'administered_at' => '2024-01-01', 'next_due_at' => '2025-01-01']);
        $new = $pet->vaccinations()->create([...$common, 'administered_at' => '2025-01-01', 'next_due_at' => '2026-01-01']);
        $otherPet->vaccinations()->create([...$common, 'administered_at' => '2025-01-01', 'next_due_at' => '2026-01-01']);
        $this->actingAs($first)->getJson('/api/v1/dashboard')->assertOk()
            ->assertJsonPath('pets.total', 1)->assertJsonCount(1, 'pets.data')->assertJsonPath('pets.data.0.id', $pet->id)
            ->assertJsonPath('archived.total', 0)
            ->assertJsonCount(1, 'due_dates')->assertJsonPath('due_dates.0.id', $new->id);
    }
}
