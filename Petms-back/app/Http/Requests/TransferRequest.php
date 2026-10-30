<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TransferRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['owner_profile_id' => ['required', 'integer', 'exists:owner_profiles,id'], 'verification_reference' => ['required', 'string', 'min:5', 'max:255']];
    }
}
