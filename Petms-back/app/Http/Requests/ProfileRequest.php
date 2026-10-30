<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['name' => ['required', 'string', 'max:150'], 'contact_number' => ['required', 'string', 'max:40'], 'address' => ['required', 'string', 'max:2000'], 'role' => ['prohibited'], 'role_id' => ['prohibited'], 'approval_status' => ['prohibited'], 'user_id' => ['prohibited'], 'enabled' => ['prohibited']];
    }
}
