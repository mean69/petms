<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WeightRecord extends Model
{
    protected $fillable = ['pet_id', 'weight_kg', 'measured_at', 'notes', 'recorded_by'];

    protected function casts(): array
    {
        return ['weight_kg' => 'decimal:3', 'measured_at' => 'date:Y-m-d'];
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
