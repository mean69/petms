<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['name', 'email', 'password', 'role_id', 'contact_number', 'address', 'approval_status', 'approval_note', 'enabled', 'email_verified_at'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'enabled' => 'boolean',
        ];
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function ownerProfile(): HasOne
    {
        return $this->hasOne(OwnerProfile::class);
    }

    public function hasRole(string ...$roles): bool
    {
        return in_array($this->role->name, $roles, true);
    }

    public function profileComplete(): bool
    {
        if ($this->ownerProfile) {
            return $this->ownerProfile && filled($this->ownerProfile->contact_number) && filled($this->ownerProfile->address);
        }

        return ! $this->hasRole('client') && filled($this->contact_number) && filled($this->address);
    }
}
