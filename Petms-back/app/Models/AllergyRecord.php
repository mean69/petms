<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AllergyRecord extends Model
{
    protected $fillable = ['pet_id', 'allergen', 'reaction', 'severity', 'identified_at', 'status', 'notes', 'recorded_by'];

    protected function casts(): array
    {
        return ['identified_at' => 'date:Y-m-d'];
    }

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
