<?php

namespace Database\Seeders;

use App\Models\Breed;
use App\Models\Species;
use App\Models\VaccineDefinition;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        foreach (['Dog' => ['Labrador Retriever', 'Golden Retriever', 'Shih Tzu', 'Aspin', 'Poodle', 'Beagle', 'German Shepherd'],
            'Cat' => ['Domestic Shorthair', 'Persian', 'Siamese', 'Puspin', 'Maine Coon'], 'Rabbit' => ['Holland Lop', 'Netherland Dwarf'], 'Bird' => ['Budgerigar', 'Cockatiel'], 'Other' => []] as $name => $breeds) {
            $species = Species::firstOrCreate(['name' => $name]);
            foreach ($breeds as $breed) {
                Breed::firstOrCreate(['species_id' => $species->id, 'name' => $breed]);
            }
        }
        foreach (['Rabies', 'Canine combination', 'Feline combination', 'Other recorded vaccine'] as $name) {
            VaccineDefinition::firstOrCreate(['name' => $name]);
        }
    }
}
