<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityLog extends Model
{
    protected $fillable = ['actor_id', 'action', 'subject_type', 'subject_id', 'before_values', 'after_values'];

    const UPDATED_AT = null;

    protected function casts(): array
    {
        return ['before_values' => 'array', 'after_values' => 'array'];
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
