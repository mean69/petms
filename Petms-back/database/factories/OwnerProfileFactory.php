<?php

namespace Database\Factories;

use App\Models\OwnerProfile;
use Illuminate\Database\Eloquent\Factories\Factory;

class OwnerProfileFactory extends Factory
{
    protected $model = OwnerProfile::class;

    public function definition(): array
    {
        return ['name' => fake()->name(), 'email' => fake()->safeEmail(), 'contact_number' => '09171234567', 'address' => fake()->address()];
    }
}
