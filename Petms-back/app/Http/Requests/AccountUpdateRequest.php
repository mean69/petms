<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AccountUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['name' => ['sometimes', 'string', 'max:150'], 'role' => ['sometimes', 'in:administrator,staff,client'], 'enabled' => ['sometimes', 'boolean'], 'reason' => ['required', 'string', 'min:5', 'max:2000'], 'approval_status' => ['prohibited'], 'role_id' => ['prohibited'], 'email' => ['prohibited']];
    }
}
