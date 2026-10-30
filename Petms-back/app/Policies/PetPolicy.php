<?php

namespace App\Policies;

use App\Models\Pet;
use App\Models\User;

class PetPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->ready($user);
    }

    public function create(User $user): bool
    {
        return $this->ready($user);
    }

    public function view(User $user, Pet $pet): bool
    {
        return $this->ready($user) && ($user->hasRole('administrator', 'staff') || $pet->currentOwnership?->owner?->user_id === $user->id);
    }

    public function update(User $user, Pet $pet): bool
    {
        return $this->view($user, $pet);
    }

    public function archive(User $user, Pet $pet): bool
    {
        return $this->view($user, $pet) && $user->hasRole('administrator', 'client');
    }

    public function clinical(User $user, Pet $pet): bool
    {
        return $this->view($user, $pet) && $user->hasRole('administrator', 'staff');
    }

    public function transfer(User $user, Pet $pet): bool
    {
        return $this->view($user, $pet) && $user->hasRole('administrator');
    }

    private function ready(User $user): bool
    {
        return $user->enabled && $user->approval_status === 'approved' && $user->profileComplete();
    }
}
