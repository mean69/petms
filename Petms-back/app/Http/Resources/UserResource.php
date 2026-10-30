<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $owner = $this->ownerProfile;

        return [
            'id' => $this->id, 'name' => $this->name, 'email' => $this->email, 'role' => $this->role->name,
            'approval_status' => $this->approval_status, 'approval_note' => $this->approval_note,
            'enabled' => $this->enabled, 'profile_complete' => $this->profileComplete(),
            'contact_number' => $owner?->contact_number ?? $this->contact_number,
            'address' => $owner?->address ?? $this->address,
            'owner_profile_id' => $owner?->id,
        ];
    }
}
