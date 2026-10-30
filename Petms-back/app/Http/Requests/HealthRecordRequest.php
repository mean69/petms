<?php

namespace App\Http\Requests;

use App\Services\ClinicalRecords;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class HealthRecordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('clinical', $this->route('pet'));
    }

    public function rules(): array
    {
        $kind = $this->route('kind');
        $existing = $this->route('record') ? ClinicalRecords::find($this->route('pet'), $kind, (int) $this->route('record')) : null;
        if ($existing) {
            $this->merge([...array_intersect_key($existing->attributesToArray(), ClinicalRecords::rules($kind)), ...$this->all()]);
        }

        return [...ClinicalRecords::rules($kind), 'pet_id' => ['prohibited'], 'recorded_by' => ['prohibited'], 'id' => ['prohibited']];
    }
}
