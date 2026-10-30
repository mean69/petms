<?php

namespace Database\Seeders;

use App\Models\OwnerProfile;
use App\Models\Pet;
use App\Models\Species;
use App\Models\User;
use App\Models\VaccineDefinition;
use App\Services\Audit;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment('local', 'testing')) {
            throw new \RuntimeException('Demo records are only available in local and testing environments.');
        }
        $this->call(DatabaseSeeder::class);
        DB::transaction(function () {
            foreach ([['admin', 'Alex Morgan', 1, 'approved'], ['staff', 'Sam Rivera', 2, 'approved'], ['pending', 'Taylor Cruz', 2, 'pending'], ['owner', 'Jamie Santos', 3, 'approved'], ['other', 'Casey Reyes', 3, 'approved']] as [$handle,$name,$role,$status]) {
                $user = User::firstOrCreate(['email' => $handle.'@petfave.test'], ['name' => $name, 'password' => 'PetFaveDemo123!', 'role_id' => $role, 'approval_status' => $status, 'contact_number' => $role === 3 ? null : '09171234567', 'address' => $role === 3 ? null : 'Quezon City, Philippines']);
                if ($role === 3) {
                    OwnerProfile::firstOrCreate(['user_id' => $user->id], ['name' => $name, 'email' => $user->email, 'contact_number' => '09171234567', 'address' => 'Quezon City, Philippines']);
                }
            }
            $recorder = User::where('email', 'staff@petfave.test')->sole();
            foreach ([['Mochi', 'Dog', 'Shih Tzu', 4.8, 'female', 'owner'], ['Milo', 'Cat', 'Domestic Shorthair', 3.6, 'male', 'owner'], ['Biscuit', 'Dog', 'Golden Retriever', 22.4, 'male', 'owner'], ['Luna', 'Cat', 'Siamese', 3.9, 'female', 'other']] as [$name,$speciesName,$breedName,$weight,$sex,$handle]) {
                $owner = User::where('email', $handle.'@petfave.test')->sole()->ownerProfile;
                if (Pet::where('name', $name)->whereHas('currentOwnership', fn ($q) => $q->where('owner_profile_id', $owner->id))->exists()) {
                    continue;
                }
                $species = Species::where('name', $speciesName)->sole();
                $pet = Pet::create(['name' => $name, 'species_id' => $species->id, 'breed_id' => $species->breeds()->where('name', $breedName)->sole()->id,
                    'sex' => $sex, 'birth_date' => today()->subYears(2)->subMonths(4), 'allergy_information_status' => 'unknown']);
                $ownership = $pet->ownerships()->create(['owner_profile_id' => $owner->id, 'verified_by' => $recorder->id, 'verification_reference' => 'Local demo registration', 'started_at' => now()]);
                $pet->update(['current_ownership_id' => $ownership->id]);
                $pet->weights()->create(['weight_kg' => $weight - .2, 'measured_at' => today()->subMonths(2), 'recorded_by' => $recorder->id]);
                $pet->weights()->create(['weight_kg' => $weight, 'measured_at' => today()->subDays(7), 'recorded_by' => $recorder->id]);
                $pet->medicalEntries()->create(['event_date' => today()->subDays(7), 'summary' => 'Previous health records reviewed and added to the pet history.', 'notes' => 'Example record for local demonstration.', 'recorded_by' => $recorder->id]);
                $pet->vaccinations()->create(['vaccine_definition_id' => VaccineDefinition::where('name', 'Rabies')->sole()->id, 'administered_at' => today()->subMonths(8), 'next_due_at' => today()->addDays(21), 'dose' => 'Recorded dose 1', 'administering_clinic' => 'PetFave Demo Clinic', 'recorded_by' => $recorder->id]);
                Audit::record('demo.pet_created', $pet);
            }
        });
    }
}
