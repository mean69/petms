<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Model;

class Audit
{
    public static function record(string $action, Model $subject, ?array $before = null, ?array $after = null): void
    {
        ActivityLog::create([
            'actor_id' => auth()->id(), 'action' => $action, 'subject_type' => $subject->getMorphClass(), 'subject_id' => $subject->getKey(),
            'before_values' => $before, 'after_values' => $after ?? $subject->getAttributes(),
        ]);
    }
}
