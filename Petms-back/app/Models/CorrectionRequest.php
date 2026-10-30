<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CorrectionRequest extends Model
{
    protected $fillable = ['pet_id', 'requested_by', 'target_type', 'weight_record_id', 'medical_entry_id', 'allergy_record_id', 'vaccination_record_id', 'pet_ownership_id', 'description', 'status', 'resolution_note', 'resolved_by', 'resolved_at'];

    protected function casts(): array
    {
        return ['resolved_at' => 'datetime'];
    }

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }
}
