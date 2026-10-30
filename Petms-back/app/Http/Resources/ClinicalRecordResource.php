<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClinicalRecordResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $values = $this->resource->attributesToArray();
        if ($request->user()->hasRole('client')) {
            unset($values['recorded_by']);
        } elseif ($this->resource->relationLoaded('recorder')) {
            $values['recorder'] = $this->resource->recorder?->only(['id', 'name']);
        }
        if ($this->resource->relationLoaded('vaccine')) {
            $values['vaccine'] = $this->resource->vaccine;
        }

        return $values;
    }
}
