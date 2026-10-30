<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Species extends Model
{
    protected $fillable = ['name'];

    protected $table = 'species';

    public $timestamps = false;

    public function breeds(): HasMany
    {
        return $this->hasMany(Breed::class);
    }
}
