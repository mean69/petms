<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VaccinationRecord extends Model
{
    protected $fillable = ['pet_id', 'vaccine_definition_id', 'administered_at', 'next_due_at', 'dose', 'batch_number', 'administering_clinic', 'notes', 'recorded_by'];

    protected function casts(): array
    {
        return ['administered_at' => 'date:Y-m-d', 'next_due_at' => 'date:Y-m-d'];
    }

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    public function vaccine(): BelongsTo
    {
        return $this->belongsTo(VaccineDefinition::class, 'vaccine_definition_id');
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
