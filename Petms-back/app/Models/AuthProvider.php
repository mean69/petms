<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuthProvider extends Model
{
    protected $fillable = ['user_id', 'provider', 'subject'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
