<?php

namespace App\Http\Requests;

use App\Models\Pet;
use App\Services\ClinicalRecords;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Validator;

class CorrectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('client');
    }

    public function rules(): array
    {
        $rules = ['pet_id' => ['required', 'integer', 'exists:pets,id'], 'target_type' => ['required', 'in:weight,medical,allergy,vaccination,ownership'],
            'description' => ['required', 'string', 'min:5', 'max:10000'], 'requested_by' => ['prohibited'], 'status' => ['prohibited'], 'resolved_by' => ['prohibited']];
        foreach (ClinicalRecords::TARGETS as $type => [$key,$model]) {
            $rules[$key] = $this->target_type === $type ? ['required', 'integer', 'exists:'.(new $model)->getTable().',id'] : ['prohibited'];
        }

        return $rules;
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }
            $pet = Pet::findOrFail($this->pet_id);
            Gate::authorize('view', $pet);
            [$key,$model] = ClinicalRecords::TARGETS[$this->target_type];
            if (! $model::whereKey($this->input($key))->where('pet_id', $pet->id)->exists()) {
                $validator->errors()->add($key, 'The correction target must belong to this pet.');
            }
            if ($this->target_type === 'ownership' && (int) $this->pet_ownership_id !== $pet->current_ownership_id) {
                $validator->errors()->add('pet_ownership_id', 'Only current ownership can be referenced.');
            }
        }];
    }
}
