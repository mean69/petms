<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class OwnerRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $owner = $this->route('owner');

        return $user->hasRole('administrator')
            || ($owner && $user->hasRole('client') && $owner->user_id === $user->id);
    }

    public function rules(): array
    {
        return ['name' => ['required', 'string', 'max:150'], 'contact_number' => ['required', 'string', 'max:40'], 'address' => ['required', 'string', 'max:2000'], 'email' => ['nullable', 'email', 'max:255'], 'user_id' => ['prohibited']];
    }
}
