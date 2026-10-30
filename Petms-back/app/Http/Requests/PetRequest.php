<?php

namespace App\Http\Requests;

use App\Models\Pet;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class PetRequest extends FormRequest
{
    public function authorize(): bool
    {
        $pet = $this->route('pet');

        return $pet
            ? Gate::allows('update', $pet)
            : Gate::allows('create', Pet::class);
    }

    public function rules(): array
    {
        $required = $this->isMethod('post') ? 'required' : 'sometimes';
        $speciesId = $this->input('species_id', $this->route('pet')?->species_id);
        $client = $this->user()->hasRole('client');

        return [
            'name' => [$required, 'string', 'max:150'], 'species_id' => [$required, 'integer', 'exists:species,id'],
            'breed_id' => ['nullable', 'integer', Rule::exists('breeds', 'id')->where('species_id', $speciesId)],
            'breed_description' => ['nullable', 'string', 'max:150'], 'birth_date' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today'],
            'birth_date_estimated' => ['sometimes', 'boolean'], 'sex' => [$required, 'in:male,female,unknown'],
            'owner_profile_id' => $client || ! $this->isMethod('post') ? ['prohibited'] : ['required', 'integer', 'exists:owner_profiles,id'],
            'current_ownership_id' => ['prohibited'], 'allergy_information_status' => ['prohibited'],
            'archived_at' => ['prohibited'], 'role' => ['prohibited'], 'weight_kg' => ['prohibited'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            $pet = $this->route('pet');
            if ($pet && $this->has('species_id') && ! $this->exists('breed_id') && $pet->breed_id && $pet->breed?->species_id !== (int) $this->species_id) {
                $validator->errors()->add('breed_id', 'Choose a breed that belongs to the new species, or select mixed/unknown.');
            }
            if ($this->boolean('birth_date_estimated') && ! $this->input('birth_date', $pet?->birth_date)) {
                $validator->errors()->add('birth_date', 'Provide the estimated birth date.');
            }
        }];
    }
}
