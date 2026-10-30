<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Breed extends Model
{
    protected $fillable = ['species_id', 'name'];

    public $timestamps = false;

    public function species(): BelongsTo
    {
        return $this->belongsTo(Species::class);
    }
}
