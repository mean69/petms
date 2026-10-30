<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Pet extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'species_id', 'breed_id', 'breed_description', 'birth_date', 'birth_date_estimated', 'sex', 'allergy_information_status', 'current_ownership_id', 'archived_at'];

    protected function casts(): array
    {
        return ['birth_date' => 'date:Y-m-d', 'birth_date_estimated' => 'boolean', 'archived_at' => 'datetime'];
    }

    public function species(): BelongsTo
    {
        return $this->belongsTo(Species::class);
    }

    public function breed(): BelongsTo
    {
        return $this->belongsTo(Breed::class);
    }

    public function currentOwnership(): BelongsTo
    {
        return $this->belongsTo(PetOwnership::class, 'current_ownership_id');
    }

    public function ownerships(): HasMany
    {
        return $this->hasMany(PetOwnership::class);
    }

    public function weights(): HasMany
    {
        return $this->hasMany(WeightRecord::class);
    }

    public function medicalEntries(): HasMany
    {
        return $this->hasMany(MedicalEntry::class);
    }

    public function allergies(): HasMany
    {
        return $this->hasMany(AllergyRecord::class);
    }

    public function vaccinations(): HasMany
    {
        return $this->hasMany(VaccinationRecord::class);
    }
}
