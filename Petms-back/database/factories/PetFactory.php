<?php

namespace Database\Factories;

use App\Models\OwnerProfile;
use App\Models\Pet;
use App\Models\Species;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class PetFactory extends Factory
{
    protected $model = Pet::class;

    public function definition(): array
    {
        return ['name' => fake()->firstName(), 'species_id' => Species::firstOrCreate(['name' => 'Dog'])->id, 'sex' => 'unknown', 'birth_date' => today()->subYears(2)->toDateString(), 'birth_date_estimated' => false];
    }

    public function ownedBy(OwnerProfile $owner): static
    {
        return $this->afterCreating(function (Pet $pet) use ($owner): void {
            $ownership = $pet->ownerships()->create(['owner_profile_id' => $owner->id, 'verified_by' => $owner->user_id ?? User::factory()->create()->id, 'verification_reference' => 'Factory verified ownership', 'started_at' => now()]);
            $pet->update(['current_ownership_id' => $ownership->id]);
        });
    }
}
