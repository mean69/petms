<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegistrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() === null;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'contact_number' => ['required', 'string', 'max:40'],
            'address' => ['required', 'string', 'max:2000'],
            'password' => ['required', 'confirmed', Password::min(10)->letters()->numbers()],
            'role' => ['required', 'in:staff,client'],
            'role_id' => ['prohibited'], 'approval_status' => ['prohibited'], 'enabled' => ['prohibited'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['email' => strtolower(trim((string) $this->email))]);
    }
}
