<?php

namespace Tests\Feature;

use App\Models\CorrectionRequest;
use App\Models\OwnerProfile;
use App\Models\Pet;
use App\Models\Species;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DatabaseIntegrityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_database_rejects_breed_from_another_species(): void
    {
        $dog = Species::where('name', 'Dog')->sole();
        $cat = Species::where('name', 'Cat')->sole();
        $this->expectException(QueryException::class);
        Pet::factory()->create(['species_id' => $dog->id, 'breed_id' => $cat->breeds()->first()->id]);
    }

    public function test_database_rejects_current_ownership_from_a_different_pet(): void
    {
        $owner = OwnerProfile::factory()->create();
        $first = Pet::factory()->ownedBy($owner)->create();
        $second = Pet::factory()->ownedBy($owner)->create();
        $this->expectException(QueryException::class);
        $second->update(['current_ownership_id' => $first->current_ownership_id]);
    }

    public function test_database_rejects_dangling_correction_foreign_keys(): void
    {
        $user = User::factory()->create();
        $pet = Pet::factory()->create();
        $this->expectException(QueryException::class);
        CorrectionRequest::create(['pet_id' => $pet->id, 'requested_by' => $user->id, 'target_type' => 'weight', 'weight_record_id' => 999999, 'description' => 'Invalid target.']);
    }

    public function test_database_requires_a_single_matching_correction_target(): void
    {
        $user = User::factory()->create();
        $pet = Pet::factory()->create();
        $weight = $pet->weights()->create(['weight_kg' => 4, 'measured_at' => today(), 'recorded_by' => $user->id]);
        $medical = $pet->medicalEntries()->create(['event_date' => today(), 'summary' => 'A record', 'recorded_by' => $user->id]);
        $this->expectException(QueryException::class);
        CorrectionRequest::create(['pet_id' => $pet->id, 'requested_by' => $user->id, 'target_type' => 'weight', 'weight_record_id' => $weight->id, 'medical_entry_id' => $medical->id, 'description' => 'Multiple targets.']);
    }
}
