<?php

namespace App\Http\Controllers;

use App\Http\Requests\OwnerRequest;
use App\Models\OwnerProfile;
use App\Models\User;
use App\Services\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OwnerController extends Controller
{
    private function authorizeOwner(Request $request, OwnerProfile $owner, bool $write = false): void
    {
        abort_unless($request->user()->hasRole('administrator') || (! $write && $request->user()->hasRole('staff')) || ($request->user()->hasRole('client') && $owner->user_id === $request->user()->id), 403);
    }

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate(['search' => ['nullable', 'string', 'max:150'], 'page' => ['nullable', 'integer', 'min:1']]);
        $query = OwnerProfile::query()->orderBy('name');
        if ($request->user()->hasRole('client')) {
            $query->where('user_id', $request->user()->id);
        }
        if ($data['search'] ?? null) {
            $query->where('name', 'like', '%'.$data['search'].'%');
        }

        return response()->json($query->paginate(50));
    }

    public function show(Request $request, OwnerProfile $owner): JsonResponse
    {
        $this->authorizeOwner($request, $owner);

        return response()->json($owner);
    }

    public function store(OwnerRequest $request): JsonResponse
    {
        abort_unless($request->user()->hasRole('administrator'), 403);
        $owner = DB::transaction(function () use ($request) {
            $owner = OwnerProfile::create($request->validated());
            Audit::record('owner.created', $owner);

            return $owner;
        });

        return response()->json($owner, 201);
    }

    public function update(OwnerRequest $request, OwnerProfile $owner): JsonResponse
    {
        $this->authorizeOwner($request, $owner, true);
        DB::transaction(function () use ($request, $owner) {
            $before = $owner->getAttributes();
            $owner->update($request->validated());
            if ($owner->user_id) {
                $owner->user->update(['name' => $owner->name]);
            }
            Audit::record('owner.updated', $owner, $before);
        });

        return response()->json($owner->fresh());
    }

    public function link(Request $request, OwnerProfile $owner): JsonResponse
    {
        $data = $request->validate(['user_id' => ['required', 'integer', 'exists:users,id'], 'verification_reference' => ['required', 'string', 'min:5', 'max:255']]);
        DB::transaction(function () use ($owner, $data) {
            $owner = OwnerProfile::lockForUpdate()->findOrFail($owner->id);
            abort_if($owner->user_id, 422, 'This owner profile is already linked.');
            $user = User::lockForUpdate()->findOrFail($data['user_id']);
            abort_unless($user->hasRole('client') && $user->enabled && $user->approval_status === 'approved', 422, 'Choose an active client account.');
            $previous = $user->ownerProfile;
            if ($previous) {
                abort_if($previous->ownerships()->exists(), 422, 'The account already has ownership history. Transfer its pets before account linking.');
                $previousBefore = $previous->getAttributes();
                $previous->update(['user_id' => null]);
                Audit::record('owner.unlinked_empty_profile', $previous, $previousBefore);
            }
            $before = $owner->getAttributes();
            $owner->update(['user_id' => $user->id]);
            $user->update(['contact_number' => null, 'address' => null]);
            Audit::record('owner.account_linked', $owner, $before, [...$owner->getAttributes(), 'verification_reference' => $data['verification_reference']]);
        });

        return response()->json($owner->fresh());
    }
}
