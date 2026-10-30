<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ResolutionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['status' => ['required', 'in:accepted,rejected'], 'resolution_note' => ['required', 'string', 'min:5', 'max:10000'], 'changes' => ['nullable', 'array']];
    }
}
