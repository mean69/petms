<?php

namespace App\Services;

use App\Models\AllergyRecord;
use App\Models\MedicalEntry;
use App\Models\Pet;
use App\Models\PetOwnership;
use App\Models\VaccinationRecord;
use App\Models\WeightRecord;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Validator;

class ClinicalRecords
{
    public const TYPES = [
        'weights' => WeightRecord::class, 'medical-history' => MedicalEntry::class,
        'allergies' => AllergyRecord::class, 'vaccinations' => VaccinationRecord::class,
    ];

    public const TARGETS = [
        'weight' => ['weight_record_id', WeightRecord::class, 'weights'],
        'medical' => ['medical_entry_id', MedicalEntry::class, 'medical-history'],
        'allergy' => ['allergy_record_id', AllergyRecord::class, 'allergies'],
        'vaccination' => ['vaccination_record_id', VaccinationRecord::class, 'vaccinations'],
        'ownership' => ['pet_ownership_id', PetOwnership::class, 'ownerships'],
    ];

    public static function rules(string $kind, ?Model $existing = null): array
    {
        $rules = match ($kind) {
            'weights' => ['weight_kg' => ['required', 'numeric', 'decimal:0,3', 'min:0.001', 'max:99999.999'], 'measured_at' => ['required', 'date_format:Y-m-d', 'before_or_equal:today']],
            'medical-history' => ['event_date' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'], 'summary' => ['required', 'string', 'max:10000']],
            'allergies' => ['allergen' => ['required', 'string', 'max:255'], 'reaction' => ['nullable', 'string', 'max:3000'],
                'severity' => ['nullable', 'in:unknown,mild,moderate,severe'], 'identified_at' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today'],
                'status' => ['required', 'in:active,resolved,entered_in_error']],
            'vaccinations' => ['vaccine_definition_id' => ['required', 'integer', 'exists:vaccine_definitions,id'],
                'administered_at' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
                'next_due_at' => ['nullable', 'date_format:Y-m-d', 'after:administered_at'],
                'dose' => ['nullable', 'string', 'max:255'], 'batch_number' => ['nullable', 'string', 'max:255'],
                'administering_clinic' => ['nullable', 'string', 'max:255']],
            default => abort(404),
        };

        return [...$rules, 'notes' => ['nullable', 'string', 'max:10000']];
    }

    public static function validate(string $kind, array $values, ?Model $existing = null): array
    {
        $rules = self::rules($kind, $existing);
        $base = $existing ? array_intersect_key($existing->attributesToArray(), $rules) : [];

        return Validator::make([...$base, ...$values], [
            ...$rules, 'pet_id' => ['prohibited'], 'recorded_by' => ['prohibited'], 'id' => ['prohibited'],
        ])->validate();
    }

    public static function find(Pet $pet, string $kind, int $id): Model
    {
        $model = self::TYPES[$kind] ?? abort(404);

        return $model::where('pet_id', $pet->id)->findOrFail($id);
    }
}
