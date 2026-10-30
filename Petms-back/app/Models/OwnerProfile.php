<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OwnerProfile extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'name', 'email', 'contact_number', 'address'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function ownerships(): HasMany
    {
        return $this->hasMany(PetOwnership::class);
    }
}
