<?php

namespace App\Http\Controllers;

use App\Http\Requests\TransferRequest;
use App\Models\Pet;
use App\Services\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class OwnershipController extends Controller
{
    public function index(Pet $pet): JsonResponse
    {
        Gate::authorize('transfer', $pet);

        return response()->json($pet->ownerships()->with('owner')->orderByDesc('id')->get());
    }

    public function transfer(TransferRequest $request, Pet $pet): JsonResponse
    {
        Gate::authorize('transfer', $pet);
        DB::transaction(function () use ($request, $pet) {
            $pet = Pet::lockForUpdate()->findOrFail($pet->id);
            $current = $pet->currentOwnership;
            abort_if($current?->owner_profile_id === (int) $request->owner_profile_id, 422, 'This is already the current owner.');
            if ($current) {
                $before = $current->getAttributes();
                $current->update(['ended_at' => now()]);
                Audit::record('ownership.ended', $current, $before);
            }
            $next = $pet->ownerships()->create([...$request->validated(), 'verified_by' => $request->user()->id, 'started_at' => now()]);
            $before = $pet->getAttributes();
            $pet->update(['current_ownership_id' => $next->id]);
            Audit::record('ownership.transferred', $pet, $before, [...$pet->getAttributes(), 'verification_reference' => $request->verification_reference]);
            Audit::record('ownership.started', $next);
        });

        return response()->json(['message' => 'Verified transfer complete. Former owner access has been revoked.']);
    }
}
