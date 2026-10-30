<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\AuthProvider;
use App\Models\Breed;
use App\Models\OwnerProfile;
use App\Models\Pet;
use App\Models\Species;
use App\Models\User;
use App\Models\VaccineDefinition;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Facades\Socialite;
use Mockery;
use Tests\TestCase;

class PetFaveSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function account(string $role = 'client', string $status = 'approved'): User
    {
        $user = User::factory()->create(['role_id' => ['administrator' => 1, 'staff' => 2, 'client' => 3][$role], 'approval_status' => $status, 'contact_number' => $role === 'client' ? null : '09171234567', 'address' => $role === 'client' ? null : 'Manila']);
        if ($role === 'client') {
            OwnerProfile::factory()->create(['user_id' => $user->id, 'name' => $user->name, 'email' => $user->email]);
        }

        return $user->fresh();
    }

    private function petFor(User $user): Pet
    {
        return Pet::factory()->ownedBy($user->ownerProfile)->create();
    }

    private function petData(): array
    {
        return ['name' => 'Mochi', 'species_id' => Species::where('name', 'Dog')->sole()->id, 'sex' => 'female', 'birth_date' => '2023-01-01'];
    }

    private function registration(string $role = 'client'): array
    {
        return ['name' => 'Jamie Santos', 'email' => 'jamie@example.test', 'contact_number' => '09170000000', 'address' => 'Manila', 'password' => 'StrongPass1234', 'password_confirmation' => 'StrongPass1234', 'role' => $role];
    }

    public function test_guests_receive_401_on_business_and_account_routes(): void
    {
        foreach (['/api/v1/pets', '/api/v1/owners', '/api/v1/me', '/api/v1/users', '/api/v1/corrections', '/api/v1/activity-logs'] as $path) {
            $this->getJson($path)->assertUnauthorized();
        }
    }

    public function test_registration_assigns_only_the_requested_public_role(): void
    {
        $this->postJson('/register', $this->registration())->assertCreated()->assertJsonPath('role', 'client')->assertJsonPath('profile_complete', true);
        $this->assertDatabaseHas('owner_profiles', ['email' => 'jamie@example.test']);
        $this->getJson('/api/v1/pets')->assertOk();
    }

    public function test_public_registration_rejects_administrator_and_status_injection(): void
    {
        $this->postJson('/register', [...$this->registration(), 'role' => 'administrator', 'approval_status' => 'approved', 'role_id' => 1])->assertUnprocessable()->assertJsonValidationErrors(['role', 'approval_status', 'role_id']);
        $this->assertDatabaseCount('users', 0);
    }

    public function test_staff_registration_is_pending_and_has_only_account_status_access(): void
    {
        $this->postJson('/register', $this->registration('staff'))->assertCreated()->assertJsonPath('approval_status', 'pending');
        $this->getJson('/api/v1/me')->assertOk();
        foreach (['/api/v1/pets', '/api/v1/owners', '/api/v1/references', '/api/v1/corrections'] as $path) {
            $this->getJson($path)->assertForbidden();
        }
        $this->patchJson('/api/v1/profile', ['name' => 'Changed', 'contact_number' => '123', 'address' => 'Manila'])->assertForbidden();
        $this->postJson('/logout')->assertOk();
    }

    public function test_rejected_and_disabled_accounts_are_blocked_even_with_sessions(): void
    {
        $staff = $this->account('staff', 'rejected');
        $this->actingAs($staff)->getJson('/api/v1/pets')->assertForbidden();
        $client = $this->account();
        $client->update(['enabled' => false]);
        $this->actingAs($client)->getJson('/api/v1/owners')->assertForbidden();
    }

    public function test_clients_cannot_read_or_mutate_other_owners_or_pets(): void
    {
        $alice = $this->account();
        $bob = $this->account();
        $pet = $this->petFor($bob);
        $this->actingAs($alice)->getJson('/api/v1/pets/'.$pet->id)->assertForbidden();
        $this->patchJson('/api/v1/pets/'.$pet->id, ['name' => 'Stolen'])->assertForbidden();
        $this->patchJson('/api/v1/pets/'.$pet->id, ['name' => ''])->assertForbidden();
        $this->getJson('/api/v1/owners/'.$bob->ownerProfile->id)->assertForbidden();
        $this->patchJson('/api/v1/owners/'.$bob->ownerProfile->id, [])->assertForbidden();
        $this->patchJson('/api/v1/owners/'.$bob->ownerProfile->id, ['name' => 'Stolen', 'contact_number' => '123', 'address' => 'X'])->assertForbidden();
        $this->postJson('/api/v1/pets/'.$pet->id.'/archive')->assertForbidden();
        $this->getJson('/api/v1/pets')->assertJsonPath('total', 0);
        $this->getJson('/api/v1/owners')->assertJsonPath('total', 1);
    }

    public function test_client_can_create_update_and_archive_own_pet_but_cannot_assign_ownership(): void
    {
        $client = $this->account();
        $this->actingAs($client);
        $this->postJson('/api/v1/pets', [...$this->petData(), 'owner_profile_id' => 999])->assertUnprocessable();
        $id = $this->postJson('/api/v1/pets', $this->petData())->assertCreated()->json('id');
        $this->patchJson('/api/v1/pets/'.$id, ['name' => 'Momo'])->assertOk()->assertJsonPath('name', 'Momo');
        $this->patchJson('/api/v1/pets/'.$id, ['current_ownership_id' => 1])->assertUnprocessable();
        $this->patchJson('/api/v1/profile', ['name' => 'Jamie', 'contact_number' => '123', 'address' => 'Manila', 'role' => 'administrator'])->assertUnprocessable();
    }

    public function test_client_cannot_write_clinical_records_or_admin_actions(): void
    {
        $client = $this->account();
        $pet = $this->petFor($client);
        $this->actingAs($client);
        foreach (['weights', 'medical-history', 'allergies', 'vaccinations'] as $kind) {
            $this->postJson('/api/v1/pets/'.$pet->id.'/'.$kind, [])->assertForbidden();
            $this->patchJson('/api/v1/pets/'.$pet->id.'/'.$kind.'/1', [])->assertForbidden();
        }
        $this->getJson('/api/v1/users')->assertForbidden();
        $this->getJson('/api/v1/activity-logs')->assertForbidden();
        $this->postJson('/api/v1/pets/'.$pet->id.'/transfer', [])->assertForbidden();
    }

    public function test_staff_can_add_all_health_records_and_view_owner_contacts(): void
    {
        $owner = $this->account();
        $pet = $this->petFor($owner);
        $staff = $this->account('staff');
        $this->actingAs($staff);
        $this->getJson('/api/v1/owners/'.$owner->ownerProfile->id)->assertOk()->assertJsonStructure(['contact_number']);
        $this->postJson('/api/v1/pets/'.$pet->id.'/weights', ['weight_kg' => 4.2, 'measured_at' => today()->toDateString()])->assertCreated();
        $this->postJson('/api/v1/pets/'.$pet->id.'/medical-history', ['event_date' => today()->toDateString(), 'summary' => 'Historical record reviewed'])->assertCreated();
        $this->postJson('/api/v1/pets/'.$pet->id.'/allergies', ['allergen' => 'Pollen', 'status' => 'active', 'severity' => 'mild'])->assertCreated();
        $this->postJson('/api/v1/pets/'.$pet->id.'/vaccinations', ['vaccine_definition_id' => VaccineDefinition::first()->id, 'administered_at' => today()->toDateString(), 'next_due_at' => today()->addMonth()->toDateString()])->assertCreated();
        $this->getJson('/api/v1/pets/'.$pet->id)->assertOk()->assertJsonCount(1, 'weights')->assertJsonCount(1, 'medical_history')->assertJsonCount(1, 'allergies')->assertJsonCount(1, 'vaccinations');
    }

    public function test_staff_cannot_transfer_approve_change_permissions_archive_or_resolve(): void
    {
        $owner = $this->account();
        $pet = $this->petFor($owner);
        $staff = $this->account('staff');
        $this->actingAs($staff);
        foreach (['/api/v1/pets/'.$pet->id.'/transfer', '/api/v1/users/'.$owner->id.'/decision', '/api/v1/corrections/1/resolve', '/api/v1/pets/'.$pet->id.'/archive'] as $path) {
            $this->postJson($path, [])->assertForbidden();
        }
        $this->patchJson('/api/v1/users/'.$owner->id, [])->assertForbidden();
        $this->getJson('/api/v1/corrections')->assertForbidden();
    }

    public function test_nested_record_id_substitution_is_blocked(): void
    {
        $alice = $this->account();
        $bob = $this->account();
        $a = $this->petFor($alice);
        $b = $this->petFor($bob);
        $weight = $b->weights()->create(['weight_kg' => 5, 'measured_at' => today(), 'recorded_by' => $bob->id]);
        $this->actingAs($alice)->getJson('/api/v1/pets/'.$a->id.'/weights/'.$weight->id)->assertNotFound();
        $staff = $this->account('staff');
        $this->actingAs($staff)->patchJson('/api/v1/pets/'.$a->id.'/weights/'.$weight->id, ['weight_kg' => 10])->assertNotFound();
    }

    public function test_clinical_validation_rejects_invalid_values_and_dates(): void
    {
        $owner = $this->account();
        $pet = $this->petFor($owner);
        $this->actingAs($this->account('staff'));
        $this->postJson('/api/v1/pets/'.$pet->id.'/weights', ['weight_kg' => 0, 'measured_at' => today()->addDay()->toDateString()])->assertUnprocessable();
        $this->postJson('/api/v1/pets/'.$pet->id.'/medical-history', ['event_date' => 'bad', 'summary' => ''])->assertUnprocessable();
        $this->postJson('/api/v1/pets/'.$pet->id.'/allergies', ['allergen' => '', 'status' => 'active'])->assertUnprocessable();
        $this->postJson('/api/v1/pets/'.$pet->id.'/vaccinations', ['vaccine_definition_id' => VaccineDefinition::first()->id, 'administered_at' => '2024-02-01', 'next_due_at' => '2024-01-01'])->assertUnprocessable();
    }

    public function test_breed_must_match_species_and_future_birth_dates_are_rejected(): void
    {
        $this->actingAs($this->account());
        $catBreed = Breed::whereHas('species', fn ($q) => $q->where('name', 'Cat'))->first();
        $this->postJson('/api/v1/pets', [...$this->petData(), 'breed_id' => $catBreed->id])->assertUnprocessable();
        $this->postJson('/api/v1/pets', [...$this->petData(), 'birth_date' => today()->addDay()->toDateString()])->assertUnprocessable();
    }

    public function test_archiving_preserves_health_records_and_clinic_access(): void
    {
        $owner = $this->account();
        $pet = $this->petFor($owner);
        $pet->weights()->create(['weight_kg' => 4, 'measured_at' => today(), 'recorded_by' => $owner->id]);
        $this->actingAs($owner)->postJson('/api/v1/pets/'.$pet->id.'/archive')->assertOk();
        $this->getJson('/api/v1/pets')->assertJsonPath('total', 0);
        $this->getJson('/api/v1/pets?archived=1')->assertJsonPath('total', 1);
        $this->actingAs($this->account('staff'))->getJson('/api/v1/pets/'.$pet->id)->assertOk()->assertJsonCount(1, 'weights');
        $this->actingAs($owner)->postJson('/api/v1/pets/'.$pet->id.'/restore')->assertOk();
        $this->assertDatabaseCount('weight_records', 1);
    }

    public function test_verified_transfer_revokes_former_access_and_preserves_health_without_owner_pii(): void
    {
        $old = $this->account();
        $new = $this->account();
        $pet = $this->petFor($old);
        $pet->medicalEntries()->create(['event_date' => today(), 'summary' => 'Health event', 'recorded_by' => $old->id]);
        $this->actingAs($this->account('administrator'))->postJson('/api/v1/pets/'.$pet->id.'/transfer', ['owner_profile_id' => $new->ownerProfile->id, 'verification_reference' => 'Checked signed transfer documents'])->assertOk();
        $this->actingAs($old)->getJson('/api/v1/pets/'.$pet->id)->assertForbidden();
        $this->actingAs($new)->getJson('/api/v1/pets/'.$pet->id)->assertOk()->assertJsonCount(1, 'medical_history')->assertJsonPath('owner.id', $new->ownerProfile->id)->assertJsonMissing(['email' => $old->email]);
        $this->getJson('/api/v1/pets/'.$pet->id.'/ownerships')->assertForbidden();
        $this->assertDatabaseCount('pet_ownerships', 2);
    }

    public function test_current_weight_uses_measurement_date_instead_of_insertion_order(): void
    {
        $user = $this->account();
        $pet = $this->petFor($user);
        $pet->weights()->create(['weight_kg' => 5, 'measured_at' => '2025-03-01', 'recorded_by' => $user->id]);
        $pet->weights()->create(['weight_kg' => 3, 'measured_at' => '2024-01-01', 'recorded_by' => $user->id]);
        $this->actingAs($user)->getJson('/api/v1/pets/'.$pet->id)->assertJsonPath('current_weight.weight_kg', '5.000');
    }

    public function test_correction_request_requires_own_pet_and_a_matching_foreign_key_target(): void
    {
        $owner = $this->account();
        $other = $this->account();
        $pet = $this->petFor($owner);
        $otherPet = $this->petFor($other);
        $weight = $otherPet->weights()->create(['weight_kg' => 4, 'measured_at' => today(), 'recorded_by' => $other->id]);
        $this->actingAs($owner)->postJson('/api/v1/corrections', ['pet_id' => $pet->id, 'target_type' => 'weight', 'weight_record_id' => $weight->id, 'description' => 'This weight looks incorrect.'])->assertUnprocessable();
        $this->postJson('/api/v1/corrections', ['pet_id' => $otherPet->id, 'target_type' => 'weight', 'weight_record_id' => $weight->id, 'description' => 'This weight looks incorrect.'])->assertForbidden();
    }

    public function test_correction_resolution_applies_validated_changes_and_audit_before_after(): void
    {
        $owner = $this->account();
        $pet = $this->petFor($owner);
        $weight = $pet->weights()->create(['weight_kg' => 4, 'measured_at' => today(), 'recorded_by' => $owner->id]);
        $id = $this->actingAs($owner)->postJson('/api/v1/corrections', ['pet_id' => $pet->id, 'target_type' => 'weight', 'weight_record_id' => $weight->id, 'description' => 'Weight should be 4.5 kg.'])->assertCreated()->json('id');
        $staff = $this->account('staff');
        $this->actingAs($staff)->postJson('/api/v1/corrections/'.$id.'/resolve', [])->assertForbidden();
        $admin = $this->account('administrator');
        $this->actingAs($admin)->postJson('/api/v1/corrections/'.$id.'/resolve', ['status' => 'accepted', 'resolution_note' => 'Verified against source record.', 'changes' => ['weight_kg' => 4.5]])->assertOk();
        $this->assertDatabaseHas('correction_requests', ['id' => $id, 'status' => 'accepted', 'resolved_by' => $admin->id]);
        $log = ActivityLog::where('action', 'clinical.weights.corrected')->sole();
        $this->assertEquals(4, $log->before_values['weight_kg']);
        $this->assertEquals(4.5, $log->after_values['weight_kg']);
        $this->assertSame($admin->id, $log->actor_id);
        $this->postJson('/api/v1/corrections/'.$id.'/resolve', ['status' => 'rejected', 'resolution_note' => 'Duplicate resolution.'])->assertUnprocessable();
    }

    public function test_invalid_correction_rolls_back_resolution_and_record_update(): void
    {
        $owner = $this->account();
        $pet = $this->petFor($owner);
        $weight = $pet->weights()->create(['weight_kg' => 4, 'measured_at' => today(), 'recorded_by' => $owner->id]);
        $id = $this->actingAs($owner)->postJson('/api/v1/corrections', ['pet_id' => $pet->id, 'target_type' => 'weight', 'weight_record_id' => $weight->id, 'description' => 'Please verify the weight.'])->json('id');
        $this->actingAs($this->account('administrator'))->postJson('/api/v1/corrections/'.$id.'/resolve', ['status' => 'accepted', 'resolution_note' => 'Invalid test correction.', 'changes' => ['weight_kg' => -4]])->assertUnprocessable();
        $this->assertDatabaseHas('correction_requests', ['id' => $id, 'status' => 'pending']);
        $this->assertEquals(4, $weight->fresh()->weight_kg);
    }

    public function test_administrator_approval_enables_staff_and_cannot_be_repeated(): void
    {
        $pending = $this->account('staff', 'pending');
        $this->actingAs($this->account('administrator'));
        $this->postJson('/api/v1/users/'.$pending->id.'/decision', ['status' => 'approved', 'note' => 'Credentials verified.'])->assertOk()->assertJsonPath('data.approval_status', 'approved');
        $this->postJson('/api/v1/users/'.$pending->id.'/decision', ['status' => 'rejected', 'note' => 'Repeated request.'])->assertUnprocessable();
        $this->actingAs($pending->fresh())->getJson('/api/v1/pets')->assertOk();
    }

    public function test_allergy_unknown_and_no_known_are_distinct_and_active_allergies_block_nka(): void
    {
        $owner = $this->account();
        $pet = $this->petFor($owner);
        $this->assertSame('unknown', $pet->fresh()->allergy_information_status);
        $this->actingAs($this->account('staff'))->patchJson('/api/v1/pets/'.$pet->id.'/allergy-status', ['allergy_information_status' => 'no_known_allergies'])->assertOk();
        $this->postJson('/api/v1/pets/'.$pet->id.'/allergies', ['allergen' => 'Pollen', 'status' => 'active'])->assertCreated();
        $this->patchJson('/api/v1/pets/'.$pet->id.'/allergy-status', ['allergy_information_status' => 'no_known_allergies'])->assertUnprocessable();
        $this->assertSame('recorded', $pet->fresh()->allergy_information_status);
    }

    public function test_login_and_logout_use_session_and_invalidate_authentication(): void
    {
        $user = $this->account('staff');
        $user->update(['password' => 'StrongPass1234']);
        $this->postJson('/login', ['email' => $user->email, 'password' => 'StrongPass1234'])->assertOk();
        $this->assertAuthenticatedAs($user);
        $this->postJson('/login', ['email' => 'different@example.test', 'password' => 'DifferentPass123'])
            ->assertOk()->assertJsonPath('data.id', $user->id)->assertJsonPath('data.role', 'staff');
        $this->postJson('/register', $this->registration())->assertForbidden();
        $this->postJson('/logout')->assertOk();
        $this->assertGuest();
        $this->getJson('/api/v1/me')->assertUnauthorized();
    }

    private function mockGoogle(string $subject, string $email, bool $verified = true): void
    {
        $identity = new \Laravel\Socialite\Two\User;
        $identity->setRaw(['sub' => $subject, 'email_verified' => $verified])->map(['id' => $subject, 'name' => 'Google Person', 'email' => $email]);
        $driver = Mockery::mock();
        $driver->shouldReceive('enablePKCE')->andReturnSelf();
        $driver->shouldReceive('user')->once()->andReturn($identity);
        Socialite::shouldReceive('driver')->with('google')->andReturn($driver);
    }

    public function test_new_google_staff_must_complete_profile_and_wait_for_approval(): void
    {
        $this->mockGoogle('google-1', 'google@example.test');
        $this->withSession(['google_registration_role' => 'staff'])->get('/auth/google/callback?code=test')->assertRedirect('http://localhost:5173/app');
        $this->getJson('/api/v1/me')->assertJsonPath('data.profile_complete', false)->assertJsonPath('data.approval_status', 'pending');
        $this->getJson('/api/v1/pets')->assertForbidden();
        $this->patchJson('/api/v1/profile', ['name' => 'Google Person', 'contact_number' => '09170000000', 'address' => 'Manila'])->assertOk()->assertJsonPath('data.profile_complete', true);
        $this->getJson('/api/v1/pets')->assertForbidden();
    }

    public function test_google_does_not_link_by_email_and_rejects_unverified_identity(): void
    {
        $existing = $this->account();
        $this->mockGoogle('google-new', $existing->email);
        $this->withSession(['google_registration_role' => 'client'])->get('/auth/google/callback?code=test')->assertRedirect('http://localhost:5173/login?google_error=email_exists');
        $this->assertDatabaseCount('auth_providers', 0);
        $this->assertGuest();
    }

    public function test_repeat_google_login_preserves_role_and_rejection(): void
    {
        $staff = $this->account('staff', 'rejected');
        AuthProvider::create(['user_id' => $staff->id, 'provider' => 'google', 'subject' => 'existing']);
        $this->mockGoogle('existing', $staff->email);
        $this->withSession(['google_registration_role' => 'client'])->get('/auth/google/callback?code=test')->assertRedirect();
        $this->getJson('/api/v1/me')->assertJsonPath('data.role', 'staff')->assertJsonPath('data.approval_status', 'rejected');
    }

    public function test_unverified_google_email_and_missing_role_cannot_create_accounts(): void
    {
        $this->mockGoogle('not-verified', 'unverified@example.test', false);
        $this->withSession(['google_registration_role' => 'client'])->get('/auth/google/callback?code=test')->assertRedirect('http://localhost:5173/login?google_error=unverified');
        $this->assertDatabaseCount('users', 0);
    }

    public function test_owner_account_link_requires_admin_verification_and_does_not_match_email(): void
    {
        $client = $this->account();
        $unlinked = OwnerProfile::factory()->create(['email' => $client->email]);
        $this->actingAs($client)->postJson('/api/v1/owners/'.$unlinked->id.'/link', ['user_id' => $client->id, 'verification_reference' => 'Checked original owner ID'])->assertForbidden();
        $admin = $this->account('administrator');
        $this->actingAs($admin)->postJson('/api/v1/owners/'.$unlinked->id.'/link', ['user_id' => $client->id])->assertUnprocessable();
        $this->postJson('/api/v1/owners/'.$unlinked->id.'/link', ['user_id' => $client->id, 'verification_reference' => 'Checked original owner ID'])->assertOk();
        $this->assertSame($client->id, $unlinked->fresh()->user_id);
    }
}
