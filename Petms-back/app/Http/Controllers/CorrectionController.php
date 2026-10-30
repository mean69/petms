<?php

namespace App\Http\Controllers;

use App\Http\Requests\CorrectionRequest as CorrectionForm;
use App\Http\Requests\ResolutionRequest;
use App\Models\CorrectionRequest;
use App\Models\Pet;
use App\Services\Audit;
use App\Services\ClinicalRecords;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class CorrectionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = CorrectionRequest::with(['pet:id,name', 'requester:id,name'])->orderByDesc('id');
        if ($request->user()->hasRole('client')) {
            $query->where('requested_by', $request->user()->id)->whereHas('pet.currentOwnership.owner', fn ($q) => $q->where('user_id', $request->user()->id));
        }

        return response()->json($query->paginate(30));
    }

    public function store(CorrectionForm $request): JsonResponse
    {
        $correction = DB::transaction(function () use ($request) {
            $pet = Pet::lockForUpdate()->findOrFail($request->pet_id);
            Gate::authorize('view', $pet);
            $correction = CorrectionRequest::create([...$request->validated(), 'requested_by' => $request->user()->id]);
            Audit::record('correction.submitted', $correction);

            return $correction;
        });

        return response()->json($correction, 201);
    }

    public function resolve(ResolutionRequest $request, CorrectionRequest $correction): JsonResponse
    {
        DB::transaction(function () use ($request, $correction) {
            $pet = Pet::lockForUpdate()->findOrFail($correction->pet_id);
            $correction = CorrectionRequest::lockForUpdate()->findOrFail($correction->id);
            abort_unless($correction->status === 'pending', 422, 'This request has already been resolved.');
            [$key,$model,$kind] = ClinicalRecords::TARGETS[$correction->target_type];
            $target = $model::where('pet_id', $pet->id)->findOrFail($correction->$key);
            if ($request->status === 'accepted') {
                if ($kind === 'ownerships') {
                    abort_unless($target->ended_at && $pet->current_ownership_id !== $target->id, 422, 'Complete the verified ownership transfer before accepting this ownership correction.');
                    abort_if($request->filled('changes'), 422, 'Use the verified ownership transfer action to change ownership.');
                } else {
                    abort_unless(is_array($request->changes) && count($request->changes) > 0, 422, 'Provide corrected record fields when accepting this request.');
                    $values = ClinicalRecords::validate($kind, $request->changes, $target);
                    $before = $target->getAttributes();
                    $target->update($values);
                    Audit::record('clinical.'.$kind.'.corrected', $target, $before);
                    if ($kind === 'allergies' && $pet->allergy_information_status !== 'recorded') {
                        $beforePet = $pet->getAttributes();
                        $pet->update(['allergy_information_status' => 'recorded']);
                        Audit::record('pet.allergy_status_updated', $pet, $beforePet);
                    }
                }
            } else {
                abort_if($request->filled('changes'), 422, 'Rejected requests cannot apply changes.');
            }
            $before = $correction->getAttributes();
            $correction->update(['status' => $request->status, 'resolution_note' => $request->resolution_note, 'resolved_by' => $request->user()->id, 'resolved_at' => now()]);
            Audit::record('correction.resolved', $correction, $before);
        });

        return response()->json($correction->fresh());
    }
}
