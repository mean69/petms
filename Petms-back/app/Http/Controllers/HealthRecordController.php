<?php

namespace App\Http\Controllers;

use App\Http\Requests\HealthRecordRequest;
use App\Http\Resources\ClinicalRecordResource;
use App\Models\Pet;
use App\Services\Audit;
use App\Services\ClinicalRecords;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class HealthRecordController extends Controller
{
    public function index(Pet $pet, string $kind): JsonResponse
    {
        Gate::authorize('view', $pet);
        $model = ClinicalRecords::TYPES[$kind] ?? abort(404);

        return response()->json(ClinicalRecordResource::collection($model::where('pet_id', $pet->id)->with('recorder:id,name')->orderByDesc('id')->get())->resolve());
    }

    public function show(Pet $pet, string $kind, int $record): JsonResponse
    {
        Gate::authorize('view', $pet);

        return response()->json((new ClinicalRecordResource(ClinicalRecords::find($pet, $kind, $record)->load('recorder:id,name')))->resolve());
    }

    public function store(HealthRecordRequest $request, Pet $pet, string $kind): JsonResponse
    {
        $record = DB::transaction(function () use ($request, $pet, $kind) {
            $pet = Pet::lockForUpdate()->findOrFail($pet->id);
            Gate::authorize('clinical', $pet);
            $model = ClinicalRecords::TYPES[$kind];
            $record = $model::create([...$request->validated(), 'pet_id' => $pet->id, 'recorded_by' => $request->user()->id]);
            if ($kind === 'allergies') {
                $this->recordAllergyState($pet);
            }
            Audit::record('clinical.'.$kind.'.created', $record);

            return $record;
        });

        return response()->json($record, 201);
    }

    public function update(HealthRecordRequest $request, Pet $pet, string $kind, int $record): JsonResponse
    {
        $record = DB::transaction(function () use ($request, $pet, $kind, $record) {
            $pet = Pet::lockForUpdate()->findOrFail($pet->id);
            Gate::authorize('clinical', $pet);
            $record = ClinicalRecords::find($pet, $kind, $record);
            $before = $record->getAttributes();
            $record->update($request->validated());
            Audit::record('clinical.'.$kind.'.updated', $record, $before);
            if ($kind === 'allergies') {
                $this->recordAllergyState($pet);
            }

            return $record;
        });

        return response()->json($record);
    }

    private function recordAllergyState(Pet $pet): void
    {
        if ($pet->allergy_information_status !== 'recorded') {
            $before = $pet->getAttributes();
            $pet->update(['allergy_information_status' => 'recorded']);
            Audit::record('pet.allergy_status_updated',$pet,$before);
        }
    }
}
