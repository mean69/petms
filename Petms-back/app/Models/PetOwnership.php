<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PetOwnership extends Model
{
    protected $fillable = ['pet_id', 'owner_profile_id', 'verified_by', 'verification_reference', 'started_at', 'ended_at'];

    protected function casts(): array
    {
        return ['started_at' => 'datetime', 'ended_at' => 'datetime'];
    }

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(OwnerProfile::class, 'owner_profile_id');
    }
}
