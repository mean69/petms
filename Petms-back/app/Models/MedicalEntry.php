<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MedicalEntry extends Model
{
    protected $fillable = ['pet_id', 'event_date', 'summary', 'notes', 'recorded_by'];

    protected function casts(): array
    {
        return ['event_date' => 'date:Y-m-d'];
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
